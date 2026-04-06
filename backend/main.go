package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type appState struct {
	db *pgxpool.Pool
}

type workspace struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	IconURL   *string   `json:"iconUrl,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type createWorkspaceRequest struct {
	Name    string  `json:"name"`
	Address string  `json:"address"`
	IconURL *string `json:"iconUrl,omitempty"`
}

type user struct {
	ID          int       `json:"id"`
	FullName    string    `json:"fullName"`
	Email       string    `json:"email"`
	Whatsapp    string    `json:"whatsapp"`
	Role        string    `json:"role"`
	WorkspaceID *int      `json:"workspaceId"`
	CreatedAt   time.Time `json:"created_at"`
}

type createUserRequest struct {
	FullName    string `json:"fullName"`
	Email       string `json:"email"`
	Whatsapp    string `json:"whatsapp"`
	Password    string `json:"password"`
	Role        string `json:"role"`
	WorkspaceID *int   `json:"workspaceId"`
}

type device struct {
	ID                int       `json:"id"`
	Name              string    `json:"name"`
	IP                string    `json:"ip"`
	Type              string    `json:"type"`
	IntegrationMode   string    `json:"integrationMode"`
	SnmpVersion       *string   `json:"snmpVersion,omitempty"`
	SnmpCommunity     string    `json:"snmpCommunity"`
	ApiUser           string    `json:"apiUser"`
	ApiPort           int       `json:"apiPort"`
	MonitoringEnabled bool      `json:"monitoringEnabled"`
	WorkspaceID       *int      `json:"workspaceId,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type createDeviceRequest struct {
	Name              string  `json:"name"`
	IP                string  `json:"ip"`
	Type              string  `json:"type"`
	IntegrationMode   string  `json:"integrationMode"`
	SnmpVersion       *string `json:"snmpVersion"`
	SnmpCommunity     string  `json:"snmpCommunity"`
	ApiUser           string  `json:"apiUser"`
	ApiPort           int     `json:"apiPort"`
	MonitoringEnabled bool    `json:"monitoringEnabled"`
	WorkspaceID       *int    `json:"workspaceId"`
}

func main() {
	ctx := context.Background()

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s",
		getEnv("POSTGRES_USER", "isp_user"),
		getEnv("POSTGRES_PASSWORD", "isp_password"),
		getEnv("POSTGRES_HOST", "localhost"),
		getEnv("POSTGRES_PORT", "5432"),
		getEnv("POSTGRES_DB", "isp_monitoring"),
	)

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("failed to create db pool: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("cannot connect to database: %v", err)
	}

	state := &appState{db: pool}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Auth: login super admin / admin workspace
	r.Post("/api/login", state.handleLogin)

	// Workspace management
	r.Post("/api/workspaces", state.handleCreateWorkspace)
	r.Get("/api/workspaces", state.handleListWorkspaces)
	r.Put("/api/workspaces/{id}", state.handleUpdateWorkspace)
	r.Delete("/api/workspaces/{id}", state.handleDeleteWorkspace)

	// Users management
	r.Get("/api/users", state.handleListUsers)
	r.Post("/api/users", state.handleCreateUser)
	r.Delete("/api/users/{id}", state.handleDeleteUser)

	// Devices management
	r.Get("/api/devices", state.handleListDevices)
	r.Post("/api/devices", state.handleCreateDevice)
	r.Post("/api/devices/test-connection", state.handleTestDeviceConnection)

	// Monitoring summary (contoh sederhana)
	r.Get("/api/monitoring/summary", state.handleMonitoringSummary)
	r.Get("/api/monitoring/ping", state.handlePingDevices)

	// Contoh endpoint: list pelanggan dari PostgreSQL
	r.Get("/api/customers", state.handleListCustomers)

	log.Println("Backend running on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatal(err)
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

type customer struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     *string   `json:"email,omitempty"`
	Address   *string   `json:"address,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type admin struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	Email            string  `json:"email"`
	Role             string  `json:"role"`
	WorkspaceID      *int    `json:"workspaceId,omitempty"`
	WorkspaceName    *string `json:"workspaceName,omitempty"`
	WorkspaceAddress *string `json:"workspaceAddress,omitempty"`
}

func (a *appState) handleUpdateWorkspace(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		http.Error(w, "invalid workspace id", http.StatusBadRequest)
		return
	}

	var req createWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("update workspace decode error: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Address == "" {
		http.Error(w, "name and address are required", http.StatusBadRequest)
		return
	}

	var ws workspace
	query := `
		UPDATE workspaces
		SET name = $1, address = $2, icon_url = $3
		WHERE id = $4
		RETURNING id, name, address, icon_url, created_at
	`
	if err := a.db.QueryRow(ctx, query, req.Name, req.Address, req.IconURL, id).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.CreatedAt); err != nil {
		log.Printf("update workspace error (id=%d): %v", id, err)
		http.Error(w, "failed to update workspace", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ws)
}

func (a *appState) handleDeleteWorkspace(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		http.Error(w, "invalid workspace id", http.StatusBadRequest)
		return
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM workspaces WHERE id = $1`, id)
	if err != nil {
		// Cek error constraint foreign key (workspace masih dipakai user / entitas lain)
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
			log.Printf("delete workspace blocked by foreign key (id=%d): %v", id, err)
			http.Error(w, "workspace masih dipakai oleh data lain (misalnya user)", http.StatusConflict)
			return
		}

		log.Printf("delete workspace error (id=%d): %v", id, err)
		http.Error(w, "failed to delete workspace", http.StatusInternalServerError)
		return
	}
	if cmdTag.RowsAffected() == 0 {
		http.Error(w, "workspace not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *appState) handleListUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := a.db.Query(ctx, `
		SELECT id, full_name, email, whatsapp, role, workspace_id, created_at
		FROM users
		ORDER BY id
	`)
	if err != nil {
		log.Printf("list users query error: %v", err)
		http.Error(w, "failed to query users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := make([]user, 0)
	for rows.Next() {
		var u user
		if err := rows.Scan(&u.ID, &u.FullName, &u.Email, &u.Whatsapp, &u.Role, &u.WorkspaceID, &u.CreatedAt); err != nil {
			log.Printf("scan user error: %v", err)
			continue
		}
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (a *appState) handleListDevices(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := a.db.Query(ctx, `
		SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_port, monitoring_enabled, workspace_id, created_at
		FROM devices
		ORDER BY id
	`)
	if err != nil {
		log.Printf("list devices query error: %v", err)
		http.Error(w, "failed to query devices", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	devices := make([]device, 0)
	for rows.Next() {
		var d device
		if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPort, &d.MonitoringEnabled, &d.WorkspaceID, &d.CreatedAt); err != nil {
			log.Printf("scan device error: %v", err)
			continue
		}
		devices = append(devices, d)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(devices)
}

func checkDeviceConnectivity(req createDeviceRequest) error {
	_, err := pingDevice(req.IP, req.IntegrationMode, req.ApiPort)
	return err
}

func pingDevice(ip string, integrationMode string, apiPort int) (time.Duration, error) {
	timeout := 3 * time.Second
	start := time.Now()

	switch integrationMode {
	case "api", "snmp+api":
		if apiPort <= 0 {
			return 0, fmt.Errorf("apiPort must be > 0 for integrationMode %s", integrationMode)
		}
		addr := fmt.Sprintf("%s:%d", ip, apiPort)
		start = time.Now()
		conn, err := net.DialTimeout("tcp", addr, timeout)
		if err != nil {
			return 0, fmt.Errorf("cannot connect to API port: %w", err)
		}
		_ = conn.Close()
	case "ping", "snmp":
		// Untuk mode ping/snmp saja, kita tidak punya port spesifik di sini.
		// Implementasi sederhana: coba buka TCP port 80 sebagai health check dasar.
		addr := fmt.Sprintf("%s:%d", ip, 80)
		start = time.Now()
		conn, err := net.DialTimeout("tcp", addr, timeout)
		if err != nil {
			return 0, fmt.Errorf("cannot reach device at port 80: %w", err)
		}
		_ = conn.Close()
	default:
		return 0, fmt.Errorf("unsupported integrationMode: %s", integrationMode)
	}

	return time.Since(start), nil
}

type devicePingResult struct {
	ID        int     `json:"id"`
	Name      string  `json:"name"`
	IP        string  `json:"ip"`
	LatencyMs int64   `json:"latencyMs"`
	Loss      float64 `json:"loss"`
	Status    string  `json:"status"`
}

func (a *appState) handlePingDevices(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()
	wsIDStr := q.Get("workspaceId")

	var rows pgx.Rows
	var err error

	if wsIDStr != "" {
		wsID, convErr := strconv.Atoi(wsIDStr)
		if convErr != nil || wsID <= 0 {
			http.Error(w, "invalid workspaceId", http.StatusBadRequest)
			return
		}
		rows, err = a.db.Query(ctx, `
			SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_port, monitoring_enabled, workspace_id, created_at
			FROM devices
			WHERE workspace_id = $1 AND monitoring_enabled = TRUE
			ORDER BY id
		`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `
			SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_port, monitoring_enabled, workspace_id, created_at
			FROM devices
			WHERE monitoring_enabled = TRUE
			ORDER BY id
		`)
	}

	if err != nil {
		log.Printf("ping devices query error: %v", err)
		http.Error(w, "failed to query devices for ping", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	results := make([]devicePingResult, 0)

	for rows.Next() {
		var d device
		if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPort, &d.MonitoringEnabled, &d.WorkspaceID, &d.CreatedAt); err != nil {
			log.Printf("scan device for ping error: %v", err)
			continue
		}

		status := "UP"
		latencyMs := int64(0)
		if !d.MonitoringEnabled {
			status = "DOWN"
		} else {
			latency, err := pingDevice(d.IP, d.IntegrationMode, d.ApiPort)
			if err != nil {
				status = "DOWN"
				log.Printf("ping device failed for %s (%s): %v", d.Name, d.IP, err)
			} else {
				latencyMs = latency.Milliseconds()
			}
		}

		results = append(results, devicePingResult{
			ID:        d.ID,
			Name:      d.Name,
			IP:        d.IP,
			LatencyMs: latencyMs,
			Loss:      0,
			Status:    status,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func (a *appState) handleTestDeviceConnection(w http.ResponseWriter, r *http.Request) {
	var req createDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("test device connection decode error: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.IP == "" || req.IntegrationMode == "" {
		http.Error(w, "ip and integrationMode are required", http.StatusBadRequest)
		return
	}

	if err := checkDeviceConnectivity(req); err != nil {
		log.Printf("device test connectivity failed for %s (%s): %v", req.Name, req.IP, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{
			"status": "failed",
			"error":  fmt.Sprintf("gagal konek ke perangkat: %v", err),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":  "ok",
		"message": "koneksi ke perangkat berhasil",
	})
}

func (a *appState) handleCreateDevice(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req createDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("create device decode error: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.IP == "" || req.Type == "" || req.IntegrationMode == "" {
		http.Error(w, "name, ip, type, and integrationMode are required", http.StatusBadRequest)
		return
	}

	if err := checkDeviceConnectivity(req); err != nil {
		log.Printf("device connectivity check failed for %s (%s): %v", req.Name, req.IP, err)
		http.Error(w, fmt.Sprintf("gagal konek ke perangkat: %v", err), http.StatusBadRequest)
		return
	}

	var d device
	query := `
		INSERT INTO devices (name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_port, monitoring_enabled, workspace_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_port, monitoring_enabled, workspace_id, created_at
	`
	if err := a.db.QueryRow(ctx, query,
		req.Name,
		req.IP,
		req.Type,
		req.IntegrationMode,
		req.SnmpVersion,
		req.SnmpCommunity,
		req.ApiUser,
		req.ApiPort,
		req.MonitoringEnabled,
		req.WorkspaceID,
	).
		Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPort, &d.MonitoringEnabled, &d.WorkspaceID, &d.CreatedAt); err != nil {
		log.Printf("create device insert error: %v", err)
		http.Error(w, "failed to create device", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(d)
}

func (a *appState) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("create user decode error: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.FullName == "" || req.Email == "" || req.Whatsapp == "" || req.Password == "" || req.Role == "" {
		http.Error(w, "fullName, email, whatsapp, password, and role are required", http.StatusBadRequest)
		return
	}

	var u user
	query := `
		INSERT INTO users (full_name, email, whatsapp, password, role, workspace_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, full_name, email, whatsapp, role, workspace_id, created_at
	`
	if err := a.db.QueryRow(ctx, query, req.FullName, req.Email, req.Whatsapp, req.Password, req.Role, req.WorkspaceID).
		Scan(&u.ID, &u.FullName, &u.Email, &u.Whatsapp, &u.Role, &u.WorkspaceID, &u.CreatedAt); err != nil {
		log.Printf("create user insert error: %v", err)
		http.Error(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(u)
}

func (a *appState) handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		log.Printf("delete user error (id=%d): %v", id, err)
		http.Error(w, "failed to delete user", http.StatusInternalServerError)
		return
	}
	if cmdTag.RowsAffected() == 0 {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *appState) handleListWorkspaces(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := a.db.Query(ctx, `SELECT id, name, address, icon_url, created_at FROM workspaces ORDER BY id`)
	if err != nil {
		log.Printf("list workspaces query error: %v", err)
		http.Error(w, "failed to query workspaces", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var workspaces []workspace
	for rows.Next() {
		var ws workspace
		if err := rows.Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.CreatedAt); err != nil {
			log.Printf("scan workspace error: %v", err)
			continue
		}
		workspaces = append(workspaces, ws)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workspaces)
}

func (a *appState) handleCreateWorkspace(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req createWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("create workspace decode error: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Address == "" {
		http.Error(w, "name and address are required", http.StatusBadRequest)
		return
	}

	var ws workspace
	query := `
		INSERT INTO workspaces (name, address, icon_url)
		VALUES ($1, $2, $3)
		RETURNING id, name, address, icon_url, created_at
	`
	if err := a.db.QueryRow(ctx, query, req.Name, req.Address, req.IconURL).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.CreatedAt); err != nil {
		log.Printf("create workspace insert error: %v", err)
		http.Error(w, "failed to create workspace", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ws)
}

func (a *appState) handleMonitoringSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var totalCustomers int
	if err := a.db.QueryRow(ctx, "SELECT COUNT(*) FROM customers").Scan(&totalCustomers); err != nil {
		log.Printf("monitoring summary query error: %v", err)
	}

	resp := map[string]any{
		"status":          "ok",
		"message":         "Monitoring API ready",
		"total_customers": totalCustomers,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (a *appState) handleListCustomers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := a.db.Query(ctx, `SELECT id, name, email, address, created_at FROM customers ORDER BY id LIMIT 100`)
	if err != nil {
		log.Printf("list customers query error: %v", err)
		http.Error(w, "failed to query customers", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var customers []customer
	for rows.Next() {
		var c customer
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Address, &c.CreatedAt); err != nil {
			log.Printf("scan customer error: %v", err)
			continue
		}
		customers = append(customers, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(customers)
}

func (a *appState) handleLogin(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("login decode error: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "email and password are required", http.StatusBadRequest)
		return
	}

	// 1) Coba autentikasi sebagai admin super
	var adm admin
	err := a.db.QueryRow(
		ctx,
		`SELECT id, email, password, role, created_at FROM admins WHERE email = $1`,
		req.Email,
	).Scan(&adm.ID, &adm.Email, &adm.Password, &adm.Role, &adm.CreatedAt)
	if err == nil {
		// NOTE: Untuk demo awal kita bandingkan plain text.
		// Di produksi sebaiknya password di-hash (bcrypt/argon2).
		if req.Password != adm.Password {
			log.Printf("login failed for admin email=%s: wrong password", req.Email)
			http.Error(w, "email atau password salah", http.StatusUnauthorized)
			return
		}

		log.Printf("login success as admin: %s (role=%s)", adm.Email, adm.Role)
		resp := loginResponse{
			Email: adm.Email,
			Role:  adm.Role,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}
	if err != nil && err != pgx.ErrNoRows {
		log.Printf("login admin query error for %s: %v", req.Email, err)
		http.Error(w, "email atau password salah", http.StatusUnauthorized)
		return
	}

	// 2) Jika bukan admin, coba autentikasi sebagai user (tabel users)
	var userID int
	var userEmail, userPassword, userRole string
	var userWorkspaceID *int
	var userCreatedAt time.Time
	var wsName, wsAddress *string
	err = a.db.QueryRow(
		ctx,
		`SELECT u.id, u.email, u.password, u.role, u.workspace_id, u.created_at, w.name, w.address
		 FROM users u
		 LEFT JOIN workspaces w ON w.id = u.workspace_id
		 WHERE u.email = $1`,
		req.Email,
	).Scan(&userID, &userEmail, &userPassword, &userRole, &userWorkspaceID, &userCreatedAt, &wsName, &wsAddress)
	if err != nil {
		if err != pgx.ErrNoRows {
			log.Printf("login user query error for %s: %v", req.Email, err)
		}
		http.Error(w, "email atau password salah", http.StatusUnauthorized)
		return
	}

	if req.Password != userPassword {
		log.Printf("login failed for user email=%s: wrong password", req.Email)
		http.Error(w, "email atau password salah", http.StatusUnauthorized)
		return
	}

	log.Printf("login success as user: %s (role=%s, workspaceID=%v)", userEmail, userRole, userWorkspaceID)
	resp := loginResponse{
		Email:            userEmail,
		Role:             userRole,
		WorkspaceID:      userWorkspaceID,
		WorkspaceName:    wsName,
		WorkspaceAddress: wsAddress,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
