package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

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
			SELECT i.id, i.customer_id, c.name, i.period_start::text, i.period_end::text, i.amount, i.status, i.workspace_id, i.payment_date, i.payment_method, i.notes, i.proof_of_transfer_url, i.created_at 
			FROM invoices i
			JOIN customers c ON i.customer_id = c.id
			WHERE i.workspace_id = $1 ORDER BY i.created_at DESC`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `
			SELECT i.id, i.customer_id, c.name, i.period_start::text, i.period_end::text, i.amount, i.status, i.workspace_id, i.payment_date, i.payment_method, i.notes, i.proof_of_transfer_url, i.created_at 
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
		if err := rows.Scan(&inv.ID, &inv.CustomerID, &inv.CustomerName, &inv.PeriodStart, &inv.PeriodEnd, &inv.Amount, &inv.Status, &inv.WorkspaceID, &inv.PaymentDate, &inv.PaymentMethod, &inv.Notes, &inv.ProofOfTransferURL, &inv.CreatedAt); err != nil {
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
		RETURNING id, customer_id, period_start::text, period_end::text, amount, status, workspace_id, payment_date, payment_method, notes, proof_of_transfer_url, created_at
	`
	status := "unpaid"
	if req.Status != "" {
		status = req.Status
	}

	var inv invoice
	err := a.db.QueryRow(ctx, query, req.CustomerID, req.PeriodStart, req.PeriodEnd, req.Amount, status, req.WorkspaceID).
		Scan(&inv.ID, &inv.CustomerID, &inv.PeriodStart, &inv.PeriodEnd, &inv.Amount, &inv.Status, &inv.WorkspaceID, &inv.PaymentDate, &inv.PaymentMethod, &inv.Notes, &inv.ProofOfTransferURL, &inv.CreatedAt)
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

	status := c.FormValue("status")
	if status == "" {
		return c.String(http.StatusBadRequest, "status is required")
	}

	paymentDateStr := c.FormValue("paymentDate")
	paymentMethod := c.FormValue("paymentMethod")
	notes := c.FormValue("notes")

	var proofURL *string
	
	// Handle File Upload
	file, err := c.FormFile("proofOfTransfer")
	if err == nil {
		src, err := file.Open()
		if err != nil {
			return err
		}
		defer src.Close()

		// Create unique filename
		filename := fmt.Sprintf("inv_%d_%d%s", id, time.Now().Unix(), filepath.Ext(file.Filename))
		dstPath := filepath.Join("uploads", "proofs", filename)
		
		dst, err := os.Create(dstPath)
		if err != nil {
			return err
		}
		defer dst.Close()

		if _, err = io.Copy(dst, src); err != nil {
			return err
		}
		url := "/uploads/proofs/" + filename
		proofURL = &url
	}

	query := `
		UPDATE invoices 
		SET status = $1, payment_date = $2, payment_method = $3, notes = $4, proof_of_transfer_url = COALESCE($5, proof_of_transfer_url)
		WHERE id = $6
		RETURNING id, customer_id, period_start::text, period_end::text, amount, status, workspace_id, payment_date, payment_method, notes, proof_of_transfer_url, created_at
	`
	
	var paymentDate *time.Time
	if paymentDateStr != "" {
		t, err := time.Parse(time.RFC3339, paymentDateStr)
		if err == nil {
			paymentDate = &t
		}
	}

	var inv invoice
	err = a.db.QueryRow(ctx, query, status, paymentDate, paymentMethod, notes, proofURL, id).
		Scan(&inv.ID, &inv.CustomerID, &inv.PeriodStart, &inv.PeriodEnd, &inv.Amount, &inv.Status, &inv.WorkspaceID, &inv.PaymentDate, &inv.PaymentMethod, &inv.Notes, &inv.ProofOfTransferURL, &inv.CreatedAt)
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

	if err := a.processSendInvoiceEmail(ctx, id); err != nil {
		log.Printf("Send invoice email error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Gagal mengirim email: " + err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok", "message": "Email tagihan berhasil dikirim!"})
}

// processSendInvoiceEmail adalah helper internal untuk mengirim email invoice
func (a *appState) processSendInvoiceEmail(ctx context.Context, invoiceID int) error {
	// 1. Ambil data Invoice & Customer Email
	var inv struct {
		ID        int
		Amount    float64
		Period    string
		FullDate  string
		CustName  string
		CustEmail *string
		CustAddr  *string
		WsID      *int
	}
	queryInv := `
		SELECT i.id, i.amount, to_char(i.period_start, 'FMMonth YYYY'), to_char(i.period_start, 'DD/MM/YYYY'), c.name, c.email, c.address, i.workspace_id
		FROM invoices i
		JOIN customers c ON i.customer_id = c.id
		WHERE i.id = $1
	`
	err := a.db.QueryRow(ctx, queryInv, invoiceID).Scan(&inv.ID, &inv.Amount, &inv.Period, &inv.FullDate, &inv.CustName, &inv.CustEmail, &inv.CustAddr, &inv.WsID)
	if err != nil {
		return fmt.Errorf("failed to fetch invoice data: %w", err)
	}

	if inv.CustEmail == nil || *inv.CustEmail == "" {
		return fmt.Errorf("Pelanggan belum mengatur alamat email")
	}

	// 2. Ambil pengaturan SMTP Workspace
	var ws struct {
		Name                   string
		SmtpHost               *string
		SmtpPort               *int
		SmtpUser               *string
		SmtpPass               *string
		SmtpFromEmail          *string
		SmtpFromName           *string
		InvoiceSubjectTemplate *string
		InvoiceBodyTemplate    *string
	}

	if inv.WsID == nil {
		return fmt.Errorf("Tagihan ini tidak terkait dengan Workspace manapun")
	}

	queryWs := `
		SELECT name, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_email, smtp_from_name, invoice_subject_template, invoice_body_template
		FROM workspaces
		WHERE id = $1
	`
	err = a.db.QueryRow(ctx, queryWs, *inv.WsID).Scan(&ws.Name, &ws.SmtpHost, &ws.SmtpPort, &ws.SmtpUser, &ws.SmtpPass, &ws.SmtpFromEmail, &ws.SmtpFromName, &ws.InvoiceSubjectTemplate, &ws.InvoiceBodyTemplate)
	if err != nil {
		return fmt.Errorf("failed to fetch workspace settings: %w", err)
	}

	if ws.SmtpHost == nil || ws.SmtpUser == nil || ws.SmtpPass == nil || ws.SmtpFromEmail == nil {
		return fmt.Errorf("Pengaturan SMTP Workspace belum lengkap")
	}

	// 3. Render Template
	amountStr := fmt.Sprintf("Rp %.0f", inv.Amount)
	subject := "Tagihan Layanan Internet"
	if ws.InvoiceSubjectTemplate != nil && *ws.InvoiceSubjectTemplate != "" {
		subject = strings.ReplaceAll(*ws.InvoiceSubjectTemplate, "{{customer_name}}", inv.CustName)
		subject = strings.ReplaceAll(subject, "{{period_label}}", inv.Period)
	}

	body := ""
	if ws.InvoiceBodyTemplate != nil && *ws.InvoiceBodyTemplate != "" {
		body = strings.ReplaceAll(*ws.InvoiceBodyTemplate, "{{customer_name}}", inv.CustName)
		body = strings.ReplaceAll(body, "{{period_label}}", inv.Period)
		body = strings.ReplaceAll(body, "{{invoice_amount}}", amountStr)
		body = strings.ReplaceAll(body, "{{isp_name}}", ws.Name)
	} else {
		// Default body if template is empty
		body = fmt.Sprintf("Halo %s,\n\nTerimakasih telah menggunakan layanan %s.\nIni adalah tagihan Anda untuk periode %s sebesar %s.\n\nTagihan Anda jatuh tempo tanggal 10. Mohon lakukan pembayaran sebelum tanggal 25 untuk menghindari penonaktifan layanan sementara.\n\nTerimakasih.", inv.CustName, ws.Name, inv.Period, amountStr)
	}

	// 4. Kirim Email
	m := gomail.NewMessage()
	if ws.SmtpFromName != nil && *ws.SmtpFromName != "" {
		m.SetHeader("From", m.FormatAddress(*ws.SmtpFromEmail, *ws.SmtpFromName))
	} else {
		m.SetHeader("From", *ws.SmtpFromEmail)
	}
	m.SetHeader("To", *inv.CustEmail)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", strings.ReplaceAll(body, "\n", "<br>"))

	port := 587
	if ws.SmtpPort != nil {
		port = *ws.SmtpPort
	}

	d := gomail.NewDialer(*ws.SmtpHost, port, *ws.SmtpUser, *ws.SmtpPass)
	
	// 5. Generate Professional PDF Attachment
	invoiceNo := fmt.Sprintf("INV/%s/%07d", strings.ReplaceAll(time.Now().Format("2006/01"), " ", ""), inv.ID)
	custAddress := ""
	if inv.CustAddr != nil {
		custAddress = *inv.CustAddr
	}

	pdfData, err := generateInvoicePDF(ws.Name, inv.CustName, inv.Period, amountStr, invoiceNo, inv.FullDate, custAddress)
	if err != nil {
		log.Printf("Warning: Failed to generate PDF for invoice %d: %v", invoiceID, err)
	} else {
		m.Attach("Invoice.pdf", gomail.SetCopyFunc(func(w io.Writer) error {
			_, err := w.Write(pdfData)
			return err
		}))
	}

	if err := d.DialAndSend(m); err != nil {
		return err
	}

	// Update is_sent status in DB
	_, err = a.db.Exec(ctx, "UPDATE invoices SET is_sent = TRUE WHERE id = $1", invoiceID)
	return err
}

// generateInvoicesForWorkspace adalah helper untuk membuat invoice otomatis setiap bulan
func (a *appState) generateInvoicesForWorkspace(ctx context.Context, wsID int) ([]int, error) {
	// 1. Ambil nominal dari tagihan terakhir untuk setiap pelanggan di workspace ini
	query := `
		SELECT DISTINCT ON (customer_id) customer_id, amount
		FROM invoices
		WHERE workspace_id = $1
		ORDER BY customer_id, period_start DESC
	`
	rows, err := a.db.Query(ctx, query, wsID)
	if err != nil {
		return nil, fmt.Errorf("failed to query invoice history: %w", err)
	}
	defer rows.Close()

	now := time.Now()
	// Periode adalah bulan ini (misal 1 April - 30 April)
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, -1)

	var createdIDs []int
	for rows.Next() {
		var custID int
		var amount float64
		if err := rows.Scan(&custID, &amount); err != nil {
			log.Printf("Error scanning invoice history for auto-billing: %v", err)
			continue
		}

		// Check if invoice already exists for this month to avoid duplicates
		var exists bool
		err := a.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM invoices WHERE customer_id = $1 AND workspace_id = $2 AND period_start = $3)", custID, wsID, periodStart).Scan(&exists)
		if err != nil {
			log.Printf("Error checking existing invoice: %v", err)
			continue
		}
		if exists {
			continue
		}

		var invID int
		insertQuery := `
			INSERT INTO invoices (customer_id, period_start, period_end, amount, status, workspace_id)
			VALUES ($1, $2, $3, $4, 'unpaid', $5)
			RETURNING id
		`
		err = a.db.QueryRow(ctx, insertQuery, custID, periodStart, periodEnd, amount, wsID).Scan(&invID)
		if err == nil {
			createdIDs = append(createdIDs, invID)
		} else {
			log.Printf("Error inserting auto-invoice for cust %d: %v", custID, err)
		}
	}

	return createdIDs, nil
}

