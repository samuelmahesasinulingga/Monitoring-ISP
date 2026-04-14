package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
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
			SELECT i.id, i.customer_id, c.name, i.period_start::text, i.period_end::text, i.amount, i.status, i.workspace_id, i.created_at 
			FROM invoices i
			JOIN customers c ON i.customer_id = c.id
			WHERE i.workspace_id = $1 ORDER BY i.created_at DESC`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `
			SELECT i.id, i.customer_id, c.name, i.period_start::text, i.period_end::text, i.amount, i.status, i.workspace_id, i.created_at 
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
		if err := rows.Scan(&inv.ID, &inv.CustomerID, &inv.CustomerName, &inv.PeriodStart, &inv.PeriodEnd, &inv.Amount, &inv.Status, &inv.WorkspaceID, &inv.CreatedAt); err != nil {
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
		RETURNING id, customer_id, period_start::text, period_end::text, amount, status, workspace_id, created_at
	`
	status := "unpaid"
	if req.Status != "" {
		status = req.Status
	}

	var inv invoice
	err := a.db.QueryRow(ctx, query, req.CustomerID, req.PeriodStart, req.PeriodEnd, req.Amount, status, req.WorkspaceID).
		Scan(&inv.ID, &inv.CustomerID, &inv.PeriodStart, &inv.PeriodEnd, &inv.Amount, &inv.Status, &inv.WorkspaceID, &inv.CreatedAt)
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
		Status string `json:"status"`
	}
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Status == "" {
		return c.String(http.StatusBadRequest, "status is required")
	}

	query := `
		UPDATE invoices 
		SET status = $1
		WHERE id = $2
		RETURNING id, customer_id, period_start::text, period_end::text, amount, status, workspace_id, created_at
	`
	var inv invoice
	err = a.db.QueryRow(ctx, query, req.Status, id).
		Scan(&inv.ID, &inv.CustomerID, &inv.PeriodStart, &inv.PeriodEnd, &inv.Amount, &inv.Status, &inv.WorkspaceID, &inv.CreatedAt)
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
