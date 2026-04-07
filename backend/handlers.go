package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/labstack/echo/v4"
	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

// Workspace handlers

func (a *appState) handleUpdateWorkspace(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	var req createWorkspaceRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("update workspace decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" || req.Address == "" {
		return c.String(http.StatusBadRequest, "name and address are required")
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
		return c.String(http.StatusInternalServerError, "failed to update workspace")
	}

	return c.JSON(http.StatusOK, ws)
}

func (a *appState) handleDeleteWorkspace(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM workspaces WHERE id = $1`, id)
	if err != nil {
		// Cek error constraint foreign key (workspace masih dipakai user / entitas lain)
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
			log.Printf("delete workspace blocked by foreign key (id=%d): %v", id, err)
			return c.String(http.StatusConflict, "workspace masih dipakai oleh data lain (misalnya user)")
		}

		log.Printf("delete workspace error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to delete workspace")
	}
	if cmdTag.RowsAffected() == 0 {
		return c.String(http.StatusNotFound, "workspace not found")
	}

	return c.NoContent(http.StatusNoContent)
}

func (a *appState) handleListWorkspaces(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := a.db.Query(ctx, `SELECT id, name, address, icon_url, created_at FROM workspaces ORDER BY id`)
	if err != nil {
		log.Printf("list workspaces query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query workspaces")
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

	return c.JSON(http.StatusOK, workspaces)
}

func (a *appState) handleCreateWorkspace(c echo.Context) error {
	ctx := c.Request().Context()

	var req createWorkspaceRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("create workspace decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" || req.Address == "" {
		return c.String(http.StatusBadRequest, "name and address are required")
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
		return c.String(http.StatusInternalServerError, "failed to create workspace")
	}

	return c.JSON(http.StatusCreated, ws)
}

// User handlers

func (a *appState) handleListUsers(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := a.db.Query(ctx, `
		SELECT id, full_name, email, whatsapp, role, workspace_id, created_at
		FROM users
		ORDER BY id
	`)
	if err != nil {
		log.Printf("list users query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query users")
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
	return c.JSON(http.StatusOK, users)
}

func (a *appState) handleCreateUser(c echo.Context) error {
	ctx := c.Request().Context()

	var req createUserRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("create user decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.FullName == "" || req.Email == "" || req.Whatsapp == "" || req.Password == "" || req.Role == "" {
		return c.String(http.StatusBadRequest, "fullName, email, whatsapp, password, and role are required")
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
		return c.String(http.StatusInternalServerError, "failed to create user")
	}

	return c.JSON(http.StatusCreated, u)
}

func (a *appState) handleDeleteUser(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid user id")
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		log.Printf("delete user error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to delete user")
	}
	if cmdTag.RowsAffected() == 0 {
		return c.String(http.StatusNotFound, "user not found")
	}

	return c.NoContent(http.StatusNoContent)
}

// Device handlers

func (a *appState) handleListDevices(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := a.db.Query(ctx, `
		SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_port, monitoring_enabled, workspace_id, created_at
		FROM devices
		ORDER BY id
	`)
	if err != nil {
		log.Printf("list devices query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query devices")
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

	return c.JSON(http.StatusOK, devices)
}

// Device creation / connectivity / monitoring handlers

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
		// Untuk mode ping/snmp, gunakan ICMP echo (IPv4) via golang.org/x/net/icmp.
		ipAddr := net.ParseIP(ip)
		if ipAddr == nil {
			return 0, fmt.Errorf("invalid IP address: %s", ip)
		}

		c, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
		if err != nil {
			return 0, fmt.Errorf("failed to listen for ICMP: %w", err)
		}
		defer c.Close()

		msg := icmp.Message{
			Type: ipv4.ICMPTypeEcho,
			Code: 0,
			Body: &icmp.Echo{
				ID:   os.Getpid() & 0xffff,
				Seq:  1,
				Data: []byte("isp-monitoring-ping"),
			},
		}

		b, err := msg.Marshal(nil)
		if err != nil {
			return 0, fmt.Errorf("failed to marshal ICMP message: %w", err)
		}

		if err := c.SetDeadline(time.Now().Add(timeout)); err != nil {
			return 0, fmt.Errorf("failed to set ICMP deadline: %w", err)
		}

		start = time.Now()
		if _, err := c.WriteTo(b, &net.IPAddr{IP: ipAddr}); err != nil {
			return 0, fmt.Errorf("failed to send ICMP echo: %w", err)
		}

		resp := make([]byte, 1500)
		if _, _, err := c.ReadFrom(resp); err != nil {
			return 0, fmt.Errorf("failed to receive ICMP echo reply: %w", err)
		}
	default:
		return 0, fmt.Errorf("unsupported integrationMode: %s", integrationMode)
	}

	return time.Since(start), nil
}

func (a *appState) handlePingDevices(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")

	var rows pgx.Rows
	var err error

	if wsIDStr != "" {
		wsID, convErr := strconv.Atoi(wsIDStr)
		if convErr != nil || wsID <= 0 {
			return c.String(http.StatusBadRequest, "invalid workspaceId")
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
		return c.String(http.StatusInternalServerError, "failed to query devices for ping")
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

	return c.JSON(http.StatusOK, results)
}

func (a *appState) handleTestDeviceConnection(c echo.Context) error {
	var req createDeviceRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("test device connection decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.IP == "" || req.IntegrationMode == "" {
		return c.String(http.StatusBadRequest, "ip and integrationMode are required")
	}

	if err := checkDeviceConnectivity(req); err != nil {
		log.Printf("device test connectivity failed for %s (%s): %v", req.Name, req.IP, err)
		return c.JSON(http.StatusBadRequest, map[string]any{
			"status": "failed",
			"error":  fmt.Sprintf("gagal konek ke perangkat: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"status":  "ok",
		"message": "koneksi ke perangkat berhasil",
	})
}

func (a *appState) handleCreateDevice(c echo.Context) error {
	ctx := c.Request().Context()

	var req createDeviceRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("create device decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" || req.IP == "" || req.Type == "" || req.IntegrationMode == "" {
		return c.String(http.StatusBadRequest, "name, ip, type, and integrationMode are required")
	}

	if err := checkDeviceConnectivity(req); err != nil {
		log.Printf("device connectivity check failed for %s (%s): %v", req.Name, req.IP, err)
		return c.String(http.StatusBadRequest, fmt.Sprintf("gagal konek ke perangkat: %v", err))
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
		return c.String(http.StatusInternalServerError, "failed to create device")
	}

	return c.JSON(http.StatusCreated, d)
}

func (a *appState) handleUpdateDevice(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	var req createDeviceRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("update device decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" || req.IP == "" || req.Type == "" || req.IntegrationMode == "" {
		return c.String(http.StatusBadRequest, "name, ip, type, and integrationMode are required")
	}

	if err := checkDeviceConnectivity(req); err != nil {
		log.Printf("device connectivity check failed for %s (%s): %v", req.Name, req.IP, err)
		return c.String(http.StatusBadRequest, fmt.Sprintf("gagal konek ke perangkat: %v", err))
	}

	var d device
	query := `
		UPDATE devices
		SET name = $1,
		    ip = $2,
		    type = $3,
		    integration_mode = $4,
		    snmp_version = $5,
		    snmp_community = $6,
		    api_user = $7,
		    api_port = $8,
		    monitoring_enabled = $9,
		    workspace_id = $10
		WHERE id = $11
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
		id,
	).
		Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPort, &d.MonitoringEnabled, &d.WorkspaceID, &d.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return c.String(http.StatusNotFound, "device not found")
		}
		log.Printf("update device error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to update device")
	}

	return c.JSON(http.StatusOK, d)
}

func (a *appState) handleDeleteDevice(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM devices WHERE id = $1`, id)
	if err != nil {
		log.Printf("delete device error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to delete device")
	}
	if cmdTag.RowsAffected() == 0 {
		return c.String(http.StatusNotFound, "device not found")
	}

	return c.NoContent(http.StatusNoContent)
}

// Monitoring & customers

func (a *appState) handleMonitoringSummary(c echo.Context) error {
	ctx := c.Request().Context()
	var totalCustomers int
	if err := a.db.QueryRow(ctx, "SELECT COUNT(*) FROM customers").Scan(&totalCustomers); err != nil {
		log.Printf("monitoring summary query error: %v", err)
	}

	resp := map[string]any{
		"status":          "ok",
		"message":         "Monitoring API ready",
		"total_customers": totalCustomers,
	}
	return c.JSON(http.StatusOK, resp)
}

func (a *appState) handleListCustomers(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := a.db.Query(ctx, `SELECT id, name, email, address, created_at FROM customers ORDER BY id LIMIT 100`)
	if err != nil {
		log.Printf("list customers query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query customers")
	}
	defer rows.Close()

	var customers []customer
	for rows.Next() {
		var cu customer
		if err := rows.Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.CreatedAt); err != nil {
			log.Printf("scan customer error: %v", err)
			continue
		}
		customers = append(customers, cu)
	}

	return c.JSON(http.StatusOK, customers)
}

// Auth: login admin/user

func (a *appState) handleLogin(c echo.Context) error {
	ctx := c.Request().Context()

	var req loginRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("login decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Email == "" || req.Password == "" {
		return c.String(http.StatusBadRequest, "email and password are required")
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
			return c.String(http.StatusUnauthorized, "email atau password salah")
		}

		log.Printf("login success as admin: %s (role=%s)", adm.Email, adm.Role)
		resp := loginResponse{
			Email: adm.Email,
			Role:  adm.Role,
		}
		return c.JSON(http.StatusOK, resp)
	}
	if err != nil && err != pgx.ErrNoRows {
		log.Printf("login admin query error for %s: %v", req.Email, err)
		return c.String(http.StatusUnauthorized, "email atau password salah")
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
		return c.String(http.StatusUnauthorized, "email atau password salah")
	}

	if req.Password != userPassword {
		log.Printf("login failed for user email=%s: wrong password", req.Email)
		return c.String(http.StatusUnauthorized, "email atau password salah")
	}

	log.Printf("login success as user: %s (role=%s, workspaceID=%v)", userEmail, userRole, userWorkspaceID)
	resp := loginResponse{
		Email:            userEmail,
		Role:             userRole,
		WorkspaceID:      userWorkspaceID,
		WorkspaceName:    wsName,
		WorkspaceAddress: wsAddress,
	}
	return c.JSON(http.StatusOK, resp)
}
