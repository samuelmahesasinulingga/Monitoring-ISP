package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/labstack/echo/v4"
	"gopkg.in/gomail.v2"
)

// ──────────────────────────────────────────────────────────
// Workspace Handlers
// ──────────────────────────────────────────────────────────

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
		RETURNING id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at, netflow_monitoring_mode, netflow_snapshot_interval, auto_report_enabled, auto_report_period, auto_report_time, sla_report_template, last_auto_report_sent
	`
	if err := a.db.QueryRow(ctx, query, req.Name, req.Address, req.IconURL).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.BillingIssueMinute, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt, &ws.NetFlowMonitoringMode, &ws.NetFlowSnapshotInterval, &ws.AutoReportEnabled, &ws.AutoReportPeriod, &ws.AutoReportTime, &ws.SlaReportTemplate, &ws.LastAutoReportSent); err != nil {
		log.Printf("create workspace insert error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create workspace")
	}

	return c.JSON(http.StatusCreated, ws)
}

func (a *appState) handleListWorkspaces(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := a.db.Query(ctx, `SELECT id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at, netflow_monitoring_mode, netflow_snapshot_interval, auto_report_enabled, auto_report_period, auto_report_time, sla_report_template, last_auto_report_sent FROM workspaces ORDER BY id`)
	if err != nil {
		log.Printf("list workspaces query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query workspaces")
	}
	defer rows.Close()

	var workspaces []workspace
	for rows.Next() {
		var ws workspace
		if err := rows.Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.BillingIssueMinute, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt, &ws.NetFlowMonitoringMode, &ws.NetFlowSnapshotInterval, &ws.AutoReportEnabled, &ws.AutoReportPeriod, &ws.AutoReportTime, &ws.SlaReportTemplate, &ws.LastAutoReportSent); err != nil {
			log.Printf("scan workspace error: %v", err)
			continue
		}
		workspaces = append(workspaces, ws)
	}

	return c.JSON(http.StatusOK, workspaces)
}

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
		RETURNING id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at, netflow_monitoring_mode, netflow_snapshot_interval, auto_report_enabled, auto_report_period, auto_report_time, sla_report_template, last_auto_report_sent
	`
	if err := a.db.QueryRow(ctx, query, req.Name, req.Address, req.IconURL, id).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.BillingIssueMinute, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt, &ws.NetFlowMonitoringMode, &ws.NetFlowSnapshotInterval, &ws.AutoReportEnabled, &ws.AutoReportPeriod, &ws.AutoReportTime, &ws.SlaReportTemplate, &ws.LastAutoReportSent); err != nil {
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
			billing_issue_minute = COALESCE($7, billing_issue_minute),
			netflow_monitoring_mode = COALESCE($8, netflow_monitoring_mode),
			netflow_snapshot_interval = COALESCE($9, netflow_snapshot_interval),
			auto_report_enabled = COALESCE($10, auto_report_enabled),
			auto_report_period = COALESCE($11, auto_report_period),
			auto_report_time = COALESCE($12, auto_report_time),
			sla_report_template = COALESCE($13, sla_report_template)
		WHERE id = $14
		RETURNING id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at, netflow_monitoring_mode, netflow_snapshot_interval, auto_report_enabled, auto_report_period, auto_report_time, sla_report_template, last_auto_report_sent
	`
	if err := a.db.QueryRow(ctx, query, req.TelegramBotToken, req.TelegramChatID, req.AlertEnabled, req.AutoBillingEnabled, req.BillingIssueDay, req.BillingIssueHour, req.BillingIssueMinute, req.NetFlowMonitoringMode, req.NetFlowSnapshotInterval, req.AutoReportEnabled, req.AutoReportPeriod, req.AutoReportTime, req.SlaReportTemplate, id).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.BillingIssueMinute, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt, &ws.NetFlowMonitoringMode, &ws.NetFlowSnapshotInterval, &ws.AutoReportEnabled, &ws.AutoReportPeriod, &ws.AutoReportTime, &ws.SlaReportTemplate, &ws.LastAutoReportSent); err != nil {
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
		RETURNING id, name, address, icon_url, telegram_bot_token, telegram_chat_id, alert_enabled, auto_billing_enabled, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month, smtp_provider, smtp_host, smtp_port, smtp_use_tls, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template, created_at, netflow_monitoring_mode, netflow_snapshot_interval, auto_report_enabled, auto_report_period, auto_report_time, sla_report_template, last_auto_report_sent
	`
	if err := a.db.QueryRow(ctx, query, req.SmtpProvider, req.SmtpHost, req.SmtpPort, req.SmtpUseTls, req.SmtpUser, req.SmtpPass, req.SmtpFromName, req.SmtpFromEmail, req.InvoiceSubjectTemplate, req.InvoiceBodyTemplate, id).
		Scan(&ws.ID, &ws.Name, &ws.Address, &ws.IconURL, &ws.TelegramBotToken, &ws.TelegramChatID, &ws.AlertEnabled, &ws.AutoBillingEnabled, &ws.BillingIssueDay, &ws.BillingIssueHour, &ws.BillingIssueMinute, &ws.LastBillingRunMonth, &ws.SmtpProvider, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUseTls, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate, &ws.CreatedAt, &ws.NetFlowMonitoringMode, &ws.NetFlowSnapshotInterval, &ws.AutoReportEnabled, &ws.AutoReportPeriod, &ws.AutoReportTime, &ws.SlaReportTemplate, &ws.LastAutoReportSent); err != nil {
		log.Printf("update workspace smtp error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to update workspace smtp settings")
	}

	return c.JSON(http.StatusOK, ws)
}

// ──────────────────────────────────────────────────────────
// SMTP Test Handler
// ──────────────────────────────────────────────────────────

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
	m.SetHeader("To", req.From)
	m.SetHeader("Subject", "Test Koneksi SMTP Monitoring ISP")
	m.SetBody("text/plain", "Koneksi SMTP berhasil! Ini adalah pesan ujicoba.")

	d := gomail.NewDialer(req.Host, req.Port, req.User, req.Pass)
	if err := d.DialAndSend(m); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"status": "failed", "error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok", "message": "Email percobaan berhasil dikirim"})
}

// ──────────────────────────────────────────────────────────
// Dashboard Summary Handler
// ──────────────────────────────────────────────────────────

func (a *appState) handleGetDashboardSummary(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.Param("id")
	wsID, err := strconv.Atoi(wsIDStr)
	if err != nil || wsID <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	summary := map[string]interface{}{
		"activeCustomer": 0,
		"activeTicket":   0,
		"unpaidInvoice":  0,
		"pingStatus": map[string]interface{}{
			"overall":      "UP",
			"avgLatencyMs": 0,
			"packetLoss":   0.0,
		},
		"activeAlertCount":     0,
		"slaThisMonth":         100.0,
		"invoiceSentThisMonth": false,
		"topInterfaces":        []map[string]interface{}{},
		"topQueues":            []map[string]interface{}{},
	}

	var custCount int
	a.db.QueryRow(ctx, "SELECT COUNT(*) FROM customers WHERE workspace_id = $1", wsID).Scan(&custCount)
	summary["activeCustomer"] = custCount

	var unpaidCount int
	a.db.QueryRow(ctx, "SELECT COUNT(*) FROM invoices WHERE workspace_id = $1 AND status = 'unpaid'", wsID).Scan(&unpaidCount)
	summary["unpaidInvoice"] = unpaidCount

	var invoiceSent bool
	a.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM invoices WHERE workspace_id = $1 AND is_sent = true AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()))", wsID).Scan(&invoiceSent)
	summary["invoiceSentThisMonth"] = invoiceSent

	var downDevices int
	a.db.QueryRow(ctx, "SELECT COUNT(*) FROM devices d LEFT JOIN LATERAL (SELECT status FROM device_ping_logs l WHERE l.device_id = d.id ORDER BY created_at DESC LIMIT 1) last_log ON true WHERE d.workspace_id = $1 AND d.monitoring_enabled = TRUE AND COALESCE(last_log.status, 'DOWN') = 'DOWN'", wsID).Scan(&downDevices)
	summary["activeAlertCount"] = downDevices

	pingStatus := summary["pingStatus"].(map[string]interface{})
	if downDevices > 0 {
		pingStatus["overall"] = "DOWN"
	}

	var avgLat float64
	a.db.QueryRow(ctx, "SELECT COALESCE(AVG(l.latency_ms), 0) FROM device_ping_logs l JOIN devices d ON l.device_id = d.id WHERE d.workspace_id = $1 AND d.monitoring_enabled = TRUE AND l.status = 'UP' AND l.created_at >= NOW() - INTERVAL '1 hour'", wsID).Scan(&avgLat)
	pingStatus["avgLatencyMs"] = int(avgLat)

	var totalLogs, upLogs int
	a.db.QueryRow(ctx, "SELECT COUNT(l.id), COUNT(CASE WHEN l.status = 'UP' THEN 1 END) FROM device_ping_logs l JOIN devices d ON l.device_id = d.id WHERE d.workspace_id = $1 AND l.created_at >= date_trunc('month', NOW())", wsID).Scan(&totalLogs, &upLogs)
	if totalLogs > 0 {
		summary["slaThisMonth"] = (float64(upLogs) / float64(totalLogs)) * 100.0
	} else {
		summary["slaThisMonth"] = 100.0
	}

	rows, err := a.db.Query(ctx, "SELECT src_ip::text, SUM(bytes) FROM flow_logs WHERE workspace_id = $1 AND captured_at >= NOW() - INTERVAL '24 hours' GROUP BY src_ip ORDER BY SUM(bytes) DESC LIMIT 5", wsID)
	if err == nil {
		defer rows.Close()
		topIfaces := []map[string]interface{}{}
		for rows.Next() {
			var ip string
			var bytes int64
			if err := rows.Scan(&ip, &bytes); err == nil {
				topIfaces = append(topIfaces, map[string]interface{}{
					"name":      ip,
					"usageMbps": bytes / (1024 * 1024),
				})
			}
		}
		summary["topInterfaces"] = topIfaces
	}

	return c.JSON(http.StatusOK, summary)
}
