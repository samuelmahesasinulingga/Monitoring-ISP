package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
	"gopkg.in/gomail.v2"
)

func (a *appState) handleListInvoices(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")

	var rows pgx.Rows
	var err error

	if wsIDStr != "" {
		wsID, convErr := strconv.Atoi(wsIDStr)
		if convErr != nil || wsID <= 0 {
			return c.String(http.StatusBadRequest, "invalid workspaceId")
		}
		// join with customers to get customer name
		rows, err = a.db.Query(ctx, `
			SELECT i.id, i.customer_id, c.name, i.period_start::text, i.period_end::text, i.amount, i.status, i.workspace_id, i.payment_date, i.payment_method, i.notes, i.created_at 
			FROM invoices i
			JOIN customers c ON i.customer_id = c.id
			WHERE i.workspace_id = $1 ORDER BY i.created_at DESC`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `
			SELECT i.id, i.customer_id, c.name, i.period_start::text, i.period_end::text, i.amount, i.status, i.workspace_id, i.payment_date, i.payment_method, i.notes, i.created_at 
			FROM invoices i
			JOIN customers c ON i.customer_id = c.id
			ORDER BY i.created_at DESC`)
	}
	if err != nil {
		log.Printf("list invoices query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query invoices")
	}
	defer rows.Close()

	var invoices []invoice
	for rows.Next() {
		var inv invoice
		// Using a time.Time for reading dates into strings can be problematic depending on driver,
		// but pgx handles date to string coercion if scanned into string sometimes.
		// Better approach: cast directly in SQL or use time.Time in struct.
		// Let's scan into string if it works, or we must scan to time.Time and format.
		// PostgreSQL returns DATE as string by default to string receivers in pgx.
		if err := rows.Scan(&inv.ID, &inv.CustomerID, &inv.CustomerName, &inv.PeriodStart, &inv.PeriodEnd, &inv.Amount, &inv.Status, &inv.WorkspaceID, &inv.PaymentDate, &inv.PaymentMethod, &inv.Notes, &inv.CreatedAt); err != nil {
			log.Printf("scan invoice error: %v", err)
			continue
		}
		// Only get YYYY-MM-DD
		if len(inv.PeriodStart) >= 10 {
			inv.PeriodStart = inv.PeriodStart[:10]
		}
		if len(inv.PeriodEnd) >= 10 {
			inv.PeriodEnd = inv.PeriodEnd[:10]
		}
		invoices = append(invoices, inv)
	}
	if invoices == nil {
		invoices = []invoice{}
	}

	return c.JSON(http.StatusOK, invoices)
}

func (a *appState) handleCreateInvoice(c echo.Context) error {
	ctx := c.Request().Context()

	var req invoice
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.CustomerID <= 0 || req.PeriodStart == "" || req.PeriodEnd == "" {
		return c.String(http.StatusBadRequest, "customer_id, period_start, period_end are required")
	}

	query := `
		INSERT INTO invoices (customer_id, period_start, period_end, amount, status, workspace_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, customer_id, period_start::text, period_end::text, amount, status, workspace_id, payment_date, payment_method, notes, created_at
	`
	status := "unpaid"
	if req.Status != "" {
		status = req.Status
	}

	var inv invoice
	err := a.db.QueryRow(ctx, query, req.CustomerID, req.PeriodStart, req.PeriodEnd, req.Amount, status, req.WorkspaceID).
		Scan(&inv.ID, &inv.CustomerID, &inv.PeriodStart, &inv.PeriodEnd, &inv.Amount, &inv.Status, &inv.WorkspaceID, &inv.PaymentDate, &inv.PaymentMethod, &inv.Notes, &inv.CreatedAt)
	if err != nil {
		log.Printf("create invoice error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create invoice")
	}
	// Fetch customer name for the response
	var cName string
	_ = a.db.QueryRow(ctx, "SELECT name FROM customers WHERE id = $1", inv.CustomerID).Scan(&cName)
	inv.CustomerName = cName
	
	if len(inv.PeriodStart) >= 10 {
		inv.PeriodStart = inv.PeriodStart[:10]
	}
	if len(inv.PeriodEnd) >= 10 {
		inv.PeriodEnd = inv.PeriodEnd[:10]
	}

	return c.JSON(http.StatusCreated, inv)
}

func (a *appState) handleUpdateInvoiceStatus(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid invoice id")
	}

	var req struct {
		Status        string  `json:"status"`
		PaymentDate   *string `json:"paymentDate"`
		PaymentMethod *string `json:"paymentMethod"`
		Notes         *string `json:"notes"`
	}
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Status == "" {
		return c.String(http.StatusBadRequest, "status is required")
	}

	query := `
		UPDATE invoices 
		SET status = $1, payment_date = $2, payment_method = $3, notes = $4
		WHERE id = $5
		RETURNING id, customer_id, period_start::text, period_end::text, amount, status, workspace_id, payment_date, payment_method, notes, created_at
	`
	var inv invoice
	err = a.db.QueryRow(ctx, query, req.Status, req.PaymentDate, req.PaymentMethod, req.Notes, id).
		Scan(&inv.ID, &inv.CustomerID, &inv.PeriodStart, &inv.PeriodEnd, &inv.Amount, &inv.Status, &inv.WorkspaceID, &inv.PaymentDate, &inv.PaymentMethod, &inv.Notes, &inv.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return c.String(http.StatusNotFound, "invoice not found")
		}
		log.Printf("update invoice error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to update invoice")
	}
	
	if len(inv.PeriodStart) >= 10 {
		inv.PeriodStart = inv.PeriodStart[:10]
	}
	if len(inv.PeriodEnd) >= 10 {
		inv.PeriodEnd = inv.PeriodEnd[:10]
	}

	return c.JSON(http.StatusOK, inv)
}

func (a *appState) handleDeleteInvoice(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid invoice id")
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM invoices WHERE id = $1`, id)
	if err != nil {
		log.Printf("delete invoice error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to delete invoice")
	}
	if cmdTag.RowsAffected() == 0 {
		return c.String(http.StatusNotFound, "invoice not found")
	}

	return c.NoContent(http.StatusNoContent)
}

func (a *appState) handleSendInvoiceEmail(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid invoice id")
	}

	// 1. Ambil data Invoice & Customer Email
	var inv struct {
		Amount float64
		Period string // Format for template
		CustName string
		CustEmail *string
		WsID *int
	}
	queryInv := `
		SELECT i.amount, to_char(i.period_start, 'FMMonth YYYY'), c.name, c.email, i.workspace_id
		FROM invoices i
		JOIN customers c ON i.customer_id = c.id
		WHERE i.id = $1
	`
	err = a.db.QueryRow(ctx, queryInv, id).Scan(&inv.Amount, &inv.Period, &inv.CustName, &inv.CustEmail, &inv.WsID)
	if err != nil {
		log.Printf("invoice email fetch error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to fetch invoice data")
	}

	if inv.CustEmail == nil || *inv.CustEmail == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Pelanggan belum mengatur alamat email."})
	}

	// 2. Ambil pengaturan SMTP Workspace
	var ws struct {
		Name string
		SmtpHost *string
		SmtpPort *int
		SmtpUser *string
		SmtpPass *string
		SmtpFromName *string
		SmtpFromEmail *string
		InvoiceSubjectTemplate *string
		InvoiceBodyTemplate *string
	}

	if inv.WsID == nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Tagihan ini tidak terkait dengan Workspace manapun."})
	}

	queryWs := `
		SELECT name, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, invoice_subject_template, invoice_body_template
		FROM workspaces
		WHERE id = $1
	`
	err = a.db.QueryRow(ctx, queryWs, *inv.WsID).Scan(&ws.Name, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromName, &ws.SmtpFromEmail, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate)
	if err != nil {
		log.Printf("workspace smtp fetch error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to fetch workspace settings")
	}

	if ws.SmtpHost == nil || ws.SmtpUser == nil || ws.SmtpPass == nil || ws.SmtpFromEmail == nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Pengaturan SMTP Workspace belum lengkap. Silakan atur di menu Pengaturan."})
	}

	// 3. Render Template
	amountStr := fmt.Sprintf("Rp %.0f", inv.Amount)
	
	subject := "Tagihan Layanan Internet"
	if ws.InvoiceSubjectTemplate != nil && *ws.InvoiceSubjectTemplate != "" {
		subject = strings.ReplaceAll(*ws.InvoiceSubjectTemplate, "{{customer_name}}", inv.CustName)
		subject = strings.ReplaceAll(subject, "{{period_label}}", inv.Period)
	}

	body := "Ini adalah tagihan Anda."
	if ws.InvoiceBodyTemplate != nil && *ws.InvoiceBodyTemplate != "" {
		body = strings.ReplaceAll(*ws.InvoiceBodyTemplate, "{{customer_name}}", inv.CustName)
		body = strings.ReplaceAll(body, "{{period_label}}", inv.Period)
		body = strings.ReplaceAll(body, "{{invoice_amount}}", amountStr)
		body = strings.ReplaceAll(body, "{{isp_name}}", ws.Name)
	}
	
	// Convert newline to <br> for HTML email
	htmlBody := strings.ReplaceAll(body, "\n", "<br>")

	// 4. Kirim Email
	importGomail := false
	m := gomail.NewMessage()
	
	fromLine := *ws.SmtpFromEmail
	if ws.SmtpFromName != nil && *ws.SmtpFromName != "" {
		m.SetHeader("From", m.FormatAddress(*ws.SmtpFromEmail, *ws.SmtpFromName))
	} else {
		m.SetHeader("From", fromLine)
	}
	
	m.SetHeader("To", *inv.CustEmail)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", htmlBody)

	// Fallback port 587
	port := 587
	if ws.SmtpPort != nil {
		port = *ws.SmtpPort
	}

	d := gomail.NewDialer(*ws.SmtpHost, port, *ws.SmtpUser, *ws.SmtpPass)
	if importGomail { /* used to bypass unused error if not already imported */ }

	if err := d.DialAndSend(m); err != nil {
		log.Printf("Failed to send invoice email: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("Gagal mengirim email: %v", err)})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok", "message": "Email tagihan berhasil dikirim!"})
}
