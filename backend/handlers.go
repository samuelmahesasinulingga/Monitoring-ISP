package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-routeros/routeros"
	"github.com/gosnmp/gosnmp"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/labstack/echo/v4"
	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
	"gopkg.in/gomail.v2"
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
		RETURNING id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at
	`
	if err := a.db.QueryRow(ctx, query, req.Name, req.Address, req.IconURL, id).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.BillingIssueMinute, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt); err != nil {
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
	rows, err := a.db.Query(ctx, `SELECT id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at FROM workspaces ORDER BY id`)
	if err != nil {
		log.Printf("list workspaces query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query workspaces")
	}
	defer rows.Close()

	var workspaces []workspace
	for rows.Next() {
		var ws workspace
		if err := rows.Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.BillingIssueMinute, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt); err != nil {
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
		RETURNING id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at
	`
	if err := a.db.QueryRow(ctx, query, req.Name, req.Address, req.IconURL).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.BillingIssueMinute, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt); err != nil {
		log.Printf("create workspace insert error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create workspace")
	}

	return c.JSON(http.StatusCreated, ws)
}

func (a *appState) handleUpdateWorkspaceSettings(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	var req updateWorkspaceSettingsRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("update workspace settings decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	var ws workspace
	query := `
		UPDATE workspaces
		SET 
			telegram_bot_token = COALESCE($1, telegram_bot_token), 
			telegram_chat_id = COALESCE($2, telegram_chat_id), 
			alert_enabled = COALESCE($3, alert_enabled), 
			auto_billing_enabled = COALESCE($4, auto_billing_enabled), 
			billing_issue_day = COALESCE($5, billing_issue_day), 
			billing_issue_hour = COALESCE($6, billing_issue_hour),
			billing_issue_minute = COALESCE($7, billing_issue_minute)
		WHERE id = $8
		RETURNING id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at
	`
	if err := a.db.QueryRow(ctx, query, req.TelegramBotToken, req.TelegramChatID, req.AlertEnabled, req.AutoBillingEnabled, req.BillingIssueDay, req.BillingIssueHour, req.BillingIssueMinute, id).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.BillingIssueMinute, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt); err != nil {
		log.Printf("update workspace settings error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to update workspace settings")
	}

	return c.JSON(http.StatusOK, ws)
}

func (a *appState) handleUpdateWorkspaceSmtpSettings(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	var req updateWorkspaceSmtpRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("update workspace smtp settings decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	var ws workspace
	query := `
		UPDATE workspaces
		SET smtp_provider = $1, smtp_host = $2, smtp_port = $3, smtp_use_tls = $4, smtp_user = $5, smtp_pass = $6, smtp_from_name = $7, smtp_from_email = $8, invoice_subject_template = $9, invoice_body_template = $10
		WHERE id = $11
		RETURNING id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at
	`
	if err := a.db.QueryRow(ctx, query, req.SmtpProvider, req.SmtpHost, req.SmtpPort, req.SmtpUseTls, req.SmtpUser, req.SmtpPass, req.SmtpFromName, req.SmtpFromEmail, req.InvoiceSubjectTemplate, req.InvoiceBodyTemplate, id).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt); err != nil {
		log.Printf("update workspace smtp error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to update workspace smtp settings")
	}

	return c.JSON(http.StatusOK, ws)
}

type testSmtpReq struct {
	Host string `json:"host"`
	Port int    `json:"port"`
	User string `json:"user"`
	Pass string `json:"pass"`
	From string `json:"from"`
}

func (a *appState) handleTestSMTP(c echo.Context) error {
	var req testSmtpReq
	if err := c.Bind(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request")
	}

	if req.Host == "" || req.Port == 0 || req.User == "" || req.Pass == "" || req.From == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"status": "failed", "error": "Harap isi Host, Port, User, Password, dan From Email"})
	}

	m := gomail.NewMessage()
	m.SetHeader("From", req.From)
	m.SetHeader("To", req.From) // Kirim ke diri sendiri
	m.SetHeader("Subject", "Test Koneksi SMTP Monitoring ISP")
	m.SetBody("text/plain", "Koneksi SMTP berhasil! Ini adalah pesan ujicoba.")

	d := gomail.NewDialer(req.Host, req.Port, req.User, req.Pass)

	// Tambahkan TLS config untuk keamanan standard
	// d.TLSConfig = &tls.Config{InsecureSkipVerify: false, ServerName: req.Host}

	if err := d.DialAndSend(m); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"status": "failed", "error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok", "message": "Email percobaan berhasil dikirim"})
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
		if err.Error() != "" && (strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint")) {
			return c.String(http.StatusConflict, "Email atau nomor WhatsApp sudah terdaftar.")
		}
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
	wsIDStr := c.QueryParam("workspaceId")

	var rows pgx.Rows
	var err error

	if wsIDStr != "" {
		wsID, convErr := strconv.Atoi(wsIDStr)
		if convErr != nil || wsID <= 0 {
			return c.String(http.StatusBadRequest, "invalid workspaceId")
		}
		rows, err = a.db.Query(ctx, `
			SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at
			FROM devices
			WHERE workspace_id = $1
			ORDER BY id
		`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `
			SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at
			FROM devices
			ORDER BY id
		`)
	}

	if err != nil {
		log.Printf("list devices query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query devices")
	}
	defer rows.Close()

	devices := make([]device, 0)
	for rows.Next() {
		var d device
		if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPassword, &d.ApiPort, &d.MonitoringEnabled, &d.PingIntervalMs, &d.MonitoredQueues, &d.MonitoredInterfaces, &d.WorkspaceID, &d.CreatedAt); err != nil {
			log.Printf("scan device error: %v", err)
			continue
		}
		devices = append(devices, d)
	}

	return c.JSON(http.StatusOK, devices)
}

// Device creation / connectivity / monitoring handlers

func checkDeviceConnectivity(req createDeviceRequest) error {
	// 1. Cek Ping atau Port API
	_, err := pingDevice(req.IP, req.IntegrationMode, req.ApiPort, req.ApiUser, req.ApiPassword)
	if err != nil {
		return err
	}

	// 2. Jika mode SNMP, cek SNMP community
	if req.IntegrationMode == "snmp" || req.IntegrationMode == "snmp+api" {
		gs := &gosnmp.GoSNMP{
			Target:    req.IP,
			Port:      161,
			Community: req.SnmpCommunity,
			Version:   gosnmp.Version2c,
			Timeout:   time.Duration(5) * time.Second,
			Retries:   2,
		}
		if req.SnmpVersion != nil && *req.SnmpVersion == "v1" {
			gs.Version = gosnmp.Version1
		}

		log.Printf("Testing SNMP connectivity to %s with community %s (version %s)", req.IP, req.SnmpCommunity, gs.Version)
		err := gs.Connect()
		if err != nil {
			log.Printf("SNMP Connect error for %s: %v", req.IP, err)
			return fmt.Errorf("SNMP connection failed: %w", err)
		}
		defer gs.Conn.Close()

		// Test ambil sysDescr (.1.3.6.1.2.1.1.1.0)
		_, err = gs.Get([]string{".1.3.6.1.2.1.1.1.0"})
		if err != nil {
			log.Printf("SNMP Get error for %s: %v", req.IP, err)
			return fmt.Errorf("SNMP request failed (check community string): %w", err)
		}
		log.Printf("SNMP connectivity to %s successful", req.IP)
	}

	return nil
}

func pingDevice(ip string, integrationMode string, apiPort int, apiUser string, apiPassword string) (time.Duration, error) {
	timeout := 3 * time.Second
	start := time.Now()

	switch integrationMode {
	case "api", "snmp+api":
		if apiPort <= 0 {
			return 0, fmt.Errorf("apiPort must be > 0 for integrationMode %s", integrationMode)
		}
		addr := fmt.Sprintf("%s:%d", ip, apiPort)
		start = time.Now()
		conn_tcp, err := net.DialTimeout("tcp", addr, timeout)
		if err != nil {
			return 0, fmt.Errorf("cannot connect to Mikrotik TCP port: %w", err)
		}
		c_ros, err := routeros.NewClient(conn_tcp)
		if err != nil {
			conn_tcp.Close()
			return 0, fmt.Errorf("cannot initialize Mikrotik client: %w", err)
		}
		err = c_ros.Login(apiUser, apiPassword)
		c_ros.Close()
		if err != nil {
			return 0, fmt.Errorf("cannot login to Mikrotik API: %w", err)
		}
		return time.Since(start), nil
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

		myID := os.Getpid() & 0xffff
		msg := icmp.Message{
			Type: ipv4.ICMPTypeEcho,
			Code: 0,
			Body: &icmp.Echo{
				ID:   myID,
				Seq:  1,
				Data: []byte("isp-monitoring-ping"),
			},
		}

		b, err := msg.Marshal(nil)
		if err != nil {
			return 0, fmt.Errorf("failed to marshal ICMP message: %w", err)
		}

		deadline := time.Now().Add(timeout)
		if err := c.SetDeadline(deadline); err != nil {
			return 0, fmt.Errorf("failed to set ICMP deadline: %w", err)
		}

		start = time.Now()
		if _, err := c.WriteTo(b, &net.IPAddr{IP: ipAddr}); err != nil {
			return 0, fmt.Errorf("failed to send ICMP echo: %w", err)
		}

		for {
			resp := make([]byte, 1500)
			n, peer, err := c.ReadFrom(resp)
			if err != nil {
				return 0, fmt.Errorf("receive error: %w", err)
			}

			// Verifikasi bahwa balasan berasal dari IP yang kita tuju
			if peer.String() != ipAddr.String() {
				// Abaikan paket dari IP lain yang mungkin "terdengar" di socket 0.0.0.0
				if time.Now().After(deadline) {
					break
				}
				continue
			}

			rm, err := icmp.ParseMessage(1, resp[:n])
			if err != nil {
				continue
			}

			// Harus bertipe Echo Reply dan memiliki ID yang sama dengan yang kita kirim
			if rm.Type == ipv4.ICMPTypeEchoReply {
				if pkt, ok := rm.Body.(*icmp.Echo); ok {
					if pkt.ID == myID {
						return time.Since(start), nil
					}
				}
			}

			if time.Now().After(deadline) {
				break
			}
		}
		return 0, fmt.Errorf("ping timeout or invalid response")
	default:
		return 0, fmt.Errorf("unsupported integrationMode: %s", integrationMode)
	}
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
			SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at
			FROM devices
			WHERE workspace_id = $1 AND monitoring_enabled = TRUE
			ORDER BY id
		`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `
			SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at
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
		if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPassword, &d.ApiPort, &d.MonitoringEnabled, &d.PingIntervalMs, &d.MonitoredQueues, &d.MonitoredInterfaces, &d.WorkspaceID, &d.CreatedAt); err != nil {
			log.Printf("scan device for ping error: %v", err)
			continue
		}

		status := "UP"
		latencyMs := int64(0)
		var history []HistoricalPing

		if !d.MonitoringEnabled {
			status = "DOWN"
		} else {
			logRows, logErr := a.db.Query(ctx, `
				SELECT latency_ms, status, created_at 
				FROM device_ping_logs 
				WHERE device_id = $1 
				ORDER BY created_at DESC 
				LIMIT 15
			`, d.ID)

			if logErr == nil {
				for logRows.Next() {
					var lMs int64
					var lStatus string
					var lTime time.Time
					if scanErr := logRows.Scan(&lMs, &lStatus, &lTime); scanErr == nil {
						timeStr := lTime.Format(time.RFC3339)
						history = append(history, HistoricalPing{
							Time:      timeStr,
							LatencyMs: lMs,
							Status:    lStatus,
						})
					}
				}
				logRows.Close()

				if len(history) > 0 {
					status = history[0].Status
					latencyMs = history[0].LatencyMs

					// Balik urutan agar ascending (waktu terlama ke terbaru) untuk grafik
					for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
						history[i], history[j] = history[j], history[i]
					}
				} else {
					status = "DOWN"
				}
			} else {
				status = "DOWN"
				log.Printf("ping device fetch log error for %s (%s): %v", d.Name, d.IP, logErr)
			}
		}

		results = append(results, devicePingResult{
			ID:                  d.ID,
			Name:                d.Name,
			IP:                  d.IP,
			IntegrationMode:     d.IntegrationMode,
			LatencyMs:           latencyMs,
			Loss:                0.0,
			Status:              status,
			PingIntervalMs:      d.PingIntervalMs,
			MonitoredQueues:     d.MonitoredQueues,
			MonitoredInterfaces: d.MonitoredInterfaces,
			History:             history,
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

	var queues []string
	var interfaces []string
	if req.IntegrationMode == "snmp" || req.IntegrationMode == "snmp+api" {
		q, err := fetchAvailableQueues(req)
		if err == nil {
			queues = q
		} else {
			log.Printf("fetchAvailableQueues failed during test: %v", err)
		}

		ifaces, err := fetchAvailableInterfaces(req)
		if err == nil {
			interfaces = ifaces
		} else {
			log.Printf("fetchAvailableInterfaces failed during test: %v", err)
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
		"status":              "ok",
		"message":             "koneksi ke perangkat berhasil",
		"availableQueues":     queues,
		"availableInterfaces": interfaces,
	})
}

func fetchAvailableQueues(req createDeviceRequest) ([]string, error) {
	gs := &gosnmp.GoSNMP{
		Target:    req.IP,
		Port:      161,
		Community: req.SnmpCommunity,
		Version:   gosnmp.Version2c,
		Timeout:   time.Duration(5) * time.Second,
		Retries:   1,
	}
	if req.SnmpVersion != nil && *req.SnmpVersion == "v1" {
		gs.Version = gosnmp.Version1
	}

	err := gs.Connect()
	if err != nil {
		return nil, err
	}
	defer gs.Conn.Close()

	queues := make([]string, 0)
	err = gs.Walk(".1.3.6.1.4.1.14988.1.1.2.1.1.2", func(p gosnmp.SnmpPDU) error {
		var name string
		switch v := p.Value.(type) {
		case []byte:
			name = string(v)
		case string:
			name = v
		default:
			name = fmt.Sprintf("%v", v)
		}
		if name != "" {
			queues = append(queues, name)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return queues, nil
}

func fetchAvailableInterfaces(req createDeviceRequest) ([]string, error) {
	gs := &gosnmp.GoSNMP{
		Target:    req.IP,
		Port:      161,
		Community: req.SnmpCommunity,
		Version:   gosnmp.Version2c,
		Timeout:   time.Duration(5) * time.Second,
		Retries:   1,
	}
	if req.SnmpVersion != nil && *req.SnmpVersion == "v1" {
		gs.Version = gosnmp.Version1
	}

	err := gs.Connect()
	if err != nil {
		return nil, err
	}
	defer gs.Conn.Close()

	ifaces := make([]string, 0)
	err = gs.Walk(".1.3.6.1.2.1.2.2.1.2", func(p gosnmp.SnmpPDU) error {
		var name string
		switch v := p.Value.(type) {
		case []byte:
			name = string(v)
		case string:
			name = v
		default:
			name = fmt.Sprintf("%v", v)
		}
		if name != "" {
			ifaces = append(ifaces, name)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return ifaces, nil
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

	if req.PingIntervalMs <= 0 {
		req.PingIntervalMs = 30000
	}

	var d device
	query := `
		INSERT INTO devices (name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at
	`
	if err := a.db.QueryRow(ctx, query,
		req.Name,
		req.IP,
		req.Type,
		req.IntegrationMode,
		req.SnmpVersion,
		req.SnmpCommunity,
		req.ApiUser,
		req.ApiPassword,
		req.ApiPort,
		req.MonitoringEnabled,
		req.PingIntervalMs,
		req.MonitoredQueues,
		req.MonitoredInterfaces,
		req.WorkspaceID,
	).
		Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPassword, &d.ApiPort, &d.MonitoringEnabled, &d.PingIntervalMs, &d.MonitoredQueues, &d.MonitoredInterfaces, &d.WorkspaceID, &d.CreatedAt); err != nil {
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

	if req.PingIntervalMs <= 0 {
		req.PingIntervalMs = 30000
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
		    api_password = $8,
		    api_port = $9,
		    monitoring_enabled = $10,
		    ping_interval_ms = $11,
			monitored_queues = $12,
			monitored_interfaces = $13,
		    workspace_id = $14
		WHERE id = $15
		RETURNING id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at
	`
	if err := a.db.QueryRow(ctx, query,
		req.Name,
		req.IP,
		req.Type,
		req.IntegrationMode,
		req.SnmpVersion,
		req.SnmpCommunity,
		req.ApiUser,
		req.ApiPassword,
		req.ApiPort,
		req.MonitoringEnabled,
		req.PingIntervalMs,
		req.MonitoredQueues,
		req.MonitoredInterfaces,
		req.WorkspaceID,
		id,
	).
		Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPassword, &d.ApiPort, &d.MonitoringEnabled, &d.PingIntervalMs, &d.MonitoredQueues, &d.MonitoredInterfaces, &d.WorkspaceID, &d.CreatedAt); err != nil {
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

func (a *appState) handleGetDevicePingLogs(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	pageStr := c.QueryParam("page")
	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	limit := 30
	offset := (page - 1) * limit

	var total int
	err = a.db.QueryRow(ctx, "SELECT COUNT(*) FROM device_ping_logs WHERE device_id = $1", id).Scan(&total)
	if err != nil {
		log.Printf("count ping logs error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to count logs")
	}

	rows, err := a.db.Query(ctx, `
		SELECT id, device_id, latency_ms, status, created_at 
		FROM device_ping_logs 
		WHERE device_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3
	`, id, limit, offset)
	if err != nil {
		log.Printf("get ping logs error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to get ping logs")
	}
	defer rows.Close()

	var logs []devicePingLog
	for rows.Next() {
		var l devicePingLog
		if err := rows.Scan(&l.ID, &l.DeviceID, &l.LatencyMs, &l.Status, &l.CreatedAt); err != nil {
			continue
		}
		logs = append(logs, l)
	}

	if logs == nil {
		logs = []devicePingLog{}
	}

	totalPages := (total + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"logs":       logs,
		"page":       page,
		"totalPages": totalPages,
		"totalItems": total,
	})
}

func (a *appState) handleListDeviceInterfaces(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	rows, err := a.db.Query(ctx, `
		SELECT DISTINCT interface_name 
		FROM device_interface_logs 
		WHERE device_id = $1 
		ORDER BY interface_name
	`, id)
	if err != nil {
		log.Printf("list device interfaces error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query interfaces")
	}
	defer rows.Close()

	interfaces := make([]string, 0)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			interfaces = append(interfaces, name)
		}
	}
	return c.JSON(http.StatusOK, interfaces)
}

type TrafficData struct {
	Time string  `json:"time"`
	RX   float64 `json:"rx"` // Mbps
	TX   float64 `json:"tx"` // Mbps
}

func (a *appState) handleGetInterfaceTraffic(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	ifaceName := c.QueryParam("interface")
	if ifaceName == "" {
		return c.String(http.StatusBadRequest, "interface name is required")
	}

	// Ambil 30 sampel terakhir (untuk dapat 29 poin delta)
	rows, err := a.db.Query(ctx, `
		SELECT in_octets, out_octets, created_at 
		FROM device_interface_logs 
		WHERE device_id = $1 AND interface_name = $2 
		ORDER BY created_at DESC 
		LIMIT 30
	`, id, ifaceName)
	if err != nil {
		log.Printf("get interface traffic query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query traffic")
	}
	defer rows.Close()

	type rawSample struct {
		In    int64
		Out   int64
		Taken time.Time
	}

	var samples []rawSample
	for rows.Next() {
		var s rawSample
		if err := rows.Scan(&s.In, &s.Out, &s.Taken); err == nil {
			samples = append(samples, s)
		}
	}

	if len(samples) < 2 {
		return c.JSON(http.StatusOK, []TrafficData{})
	}

	var results []TrafficData
	// Kalkulasi Mbps: (current - previous) * 8 / (timeDelta in seconds) / 1,000,000
	for i := 0; i < len(samples)-1; i++ {
		curr := samples[i]
		prev := samples[i+1]

		timeDelta := curr.Taken.Sub(prev.Taken).Seconds()
		if timeDelta <= 0 {
			continue
		}

		rxMbps := 0.0
		if curr.In >= prev.In {
			rxMbps = float64(curr.In-prev.In) * 8 / timeDelta / 1000000
		}

		txMbps := 0.0
		if curr.Out >= prev.Out {
			txMbps = float64(curr.Out-prev.Out) * 8 / timeDelta / 1000000
		}

		results = append(results, TrafficData{
			Time: curr.Taken.Format(time.RFC3339),
			RX:   rxMbps,
			TX:   txMbps,
		})
	}

	// Reverse results agar urutan waktu maju
	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}

	return c.JSON(http.StatusOK, results)
}

func (a *appState) handleListDeviceQueues(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	rows, err := a.db.Query(ctx, `
		SELECT DISTINCT queue_name 
		FROM device_queue_logs 
		WHERE device_id = $1 
		ORDER BY queue_name
	`, id)
	if err != nil {
		log.Printf("list device queues error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query queues")
	}
	defer rows.Close()

	queues := make([]string, 0)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			queues = append(queues, name)
		}
	}
	return c.JSON(http.StatusOK, queues)
}

func (a *appState) handleGetQueueTraffic(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	queueName := c.QueryParam("queue")
	if queueName == "" {
		return c.String(http.StatusBadRequest, "queue name is required")
	}

	// Ambil 30 sampel terakhir
	rows, err := a.db.Query(ctx, `
		SELECT bytes_in, bytes_out, created_at 
		FROM device_queue_logs 
		WHERE device_id = $1 AND queue_name = $2 
		ORDER BY created_at DESC 
		LIMIT 30
	`, id, queueName)
	if err != nil {
		log.Printf("get queue traffic query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query traffic")
	}
	defer rows.Close()

	type rawSample struct {
		In    int64
		Out   int64
		Taken time.Time
	}

	var samples []rawSample
	for rows.Next() {
		var s rawSample
		if err := rows.Scan(&s.In, &s.Out, &s.Taken); err == nil {
			samples = append(samples, s)
		}
	}

	if len(samples) < 2 {
		return c.JSON(http.StatusOK, []TrafficData{})
	}

	var results []TrafficData
	for i := 0; i < len(samples)-1; i++ {
		curr := samples[i]
		prev := samples[i+1]

		timeDelta := curr.Taken.Sub(prev.Taken).Seconds()
		if timeDelta <= 0 {
			continue
		}

		rxMbps := 0.0
		if curr.In >= prev.In {
			// bytes_in dari mikrotik berarti receive oleh queue
			rxMbps = float64(curr.In-prev.In) * 8 / timeDelta / 1000000
		}

		txMbps := 0.0
		if curr.Out >= prev.Out {
			txMbps = float64(curr.Out-prev.Out) * 8 / timeDelta / 1000000
		}

		results = append(results, TrafficData{
			Time: curr.Taken.Format(time.RFC3339),
			RX:   rxMbps,
			TX:   txMbps,
		})
	}

	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}

	return c.JSON(http.StatusOK, results)
}

func (a *appState) handleUpdatePingInterval(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	var req struct {
		PingIntervalMs int `json:"pingIntervalMs"`
	}
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.PingIntervalMs < 10000 {
		req.PingIntervalMs = 30000 // minimum 10 seconds, fallback 30s
	}

	_, err = a.db.Exec(ctx, `
		UPDATE devices SET ping_interval_ms = $1 WHERE id = $2
	`, req.PingIntervalMs, id)

	if err != nil {
		log.Printf("update ping interval error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to update ping interval")
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func (a *appState) handleGetAlerts(c echo.Context) error {
	ctx := c.Request().Context()
	workspaceIDStr := c.QueryParam("workspace_id")
	workspaceID, _ := strconv.Atoi(workspaceIDStr)
	pageStr := c.QueryParam("page")
	page, _ := strconv.Atoi(pageStr)
	if page <= 0 {
		page = 1
	}
	limit := 30
	offset := (page - 1) * limit

	// Get total count
	var totalCount int
	err := a.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM device_alerts a
		JOIN devices d ON a.device_id = d.id
		WHERE ($1 = 0 OR d.workspace_id = $1)
	`, workspaceID).Scan(&totalCount)
	if err != nil {
		log.Printf("count alerts query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to count alerts")
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages <= 0 {
		totalPages = 1
	}

	query := `
		SELECT a.id, a.device_id, d.name as device_name, a.status, a.created_at
		FROM device_alerts a
		JOIN devices d ON a.device_id = d.id
		WHERE ($1 = 0 OR d.workspace_id = $1)
		ORDER BY a.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := a.db.Query(ctx, query, workspaceID, limit, offset)
	if err != nil {
		log.Printf("get alerts query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query alerts")
	}
	defer rows.Close()

	alerts := []deviceAlert{}
	for rows.Next() {
		var al deviceAlert
		if err := rows.Scan(&al.ID, &al.DeviceID, &al.DeviceName, &al.Status, &al.CreatedAt); err != nil {
			log.Printf("scan alert error: %v", err)
			continue
		}
		alerts = append(alerts, al)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"alerts":     alerts,
		"totalPages": totalPages,
	})
}
