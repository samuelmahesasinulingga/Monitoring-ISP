package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
)

func (a *appState) handleListCustomers(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")

	var rows pgx.Rows
	var err error

	if wsIDStr != "" {
		wsID, convErr := strconv.Atoi(wsIDStr)
		if convErr != nil || wsID <= 0 {
			return c.String(http.StatusBadRequest, "invalid workspaceId")
		}
		rows, err = a.db.Query(ctx, `SELECT id, name, email, address, workspace_id, device_id, queue_name, COALESCE(monthly_price, 0), username, created_at FROM customers WHERE workspace_id = $1 ORDER BY id`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `SELECT id, name, email, address, workspace_id, device_id, queue_name, COALESCE(monthly_price, 0), username, created_at FROM customers ORDER BY id`)
	}
	if err != nil {
		log.Printf("list customers query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query customers")
	}
	defer rows.Close()

	var customers []customer
	for rows.Next() {
		var cu customer
		if err := rows.Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.WorkspaceID, &cu.DeviceID, &cu.QueueName, &cu.MonthlyPrice, &cu.Username, &cu.CreatedAt); err != nil {
			log.Printf("scan customer error: %v", err)
			continue
		}
		customers = append(customers, cu)
	}
	if customers == nil {
		customers = []customer{}
	}

	return c.JSON(http.StatusOK, customers)
}

func (a *appState) handleCreateCustomer(c echo.Context) error {
	ctx := c.Request().Context()

	var req customer
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" {
		return c.String(http.StatusBadRequest, "name is required")
	}

	query := `
		INSERT INTO customers (name, email, address, workspace_id, device_id, queue_name, monthly_price, username, password)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, name, email, address, workspace_id, device_id, queue_name, COALESCE(monthly_price, 0), username, created_at
	`
	var cu customer
	err := a.db.QueryRow(ctx, query, req.Name, req.Email, req.Address, req.WorkspaceID, req.DeviceID, req.QueueName, req.MonthlyPrice, req.Username, req.Password).
		Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.WorkspaceID, &cu.DeviceID, &cu.QueueName, &cu.MonthlyPrice, &cu.Username, &cu.CreatedAt)
	if err != nil {
		log.Printf("create customer error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create customer")
	}

	return c.JSON(http.StatusCreated, cu)
}

func (a *appState) handleUpdateCustomer(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid customer id")
	}

	var req customer
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" {
		return c.String(http.StatusBadRequest, "name is required")
	}

	query := `
		UPDATE customers 
		SET name = $1, email = $2, address = $3, device_id = $4, queue_name = $5, monthly_price = $6, username = $7, password = $8
		WHERE id = $9
		RETURNING id, name, email, address, workspace_id, device_id, queue_name, COALESCE(monthly_price, 0), username, created_at
	`
	var cu customer
	err = a.db.QueryRow(ctx, query, req.Name, req.Email, req.Address, req.DeviceID, req.QueueName, req.MonthlyPrice, req.Username, req.Password, id).
		Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.WorkspaceID, &cu.DeviceID, &cu.QueueName, &cu.MonthlyPrice, &cu.Username, &cu.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return c.String(http.StatusNotFound, "customer not found")
		}
		log.Printf("update customer error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to update customer")
	}

	return c.JSON(http.StatusOK, cu)
}

func (a *appState) handleDeleteCustomer(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid customer id")
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM customers WHERE id = $1`, id)
	if err != nil {
		log.Printf("delete customer error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to delete customer")
	}
	if cmdTag.RowsAffected() == 0 {
		return c.String(http.StatusNotFound, "customer not found")
	}

	return c.NoContent(http.StatusNoContent)
}

func (a *appState) handleGetCustomerQueues(c echo.Context) error {
	ctx := c.Request().Context()
	deviceIDStr := c.QueryParam("deviceId")
	deviceID, err := strconv.Atoi(deviceIDStr)
	if err != nil || deviceID <= 0 {
		return c.String(http.StatusBadRequest, "invalid deviceId")
	}

	var d device
	err = a.db.QueryRow(ctx, `SELECT ip, snmp_community, snmp_version FROM devices WHERE id = $1`, deviceID).
		Scan(&d.IP, &d.SnmpCommunity, &d.SnmpVersion)
	if err != nil {
		log.Printf("get device for queues error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to get device")
	}

	req := createDeviceRequest{
		IP:            d.IP,
		SnmpCommunity: d.SnmpCommunity,
		SnmpVersion:   d.SnmpVersion,
	}

	queues, err := fetchAvailableQueues(req)
	if err != nil {
		log.Printf("fetch queues error for device %d: %v", deviceID, err)
		return c.String(http.StatusInternalServerError, "failed to fetch queues from device")
	}

	return c.JSON(http.StatusOK, queues)
}

// ──────────────────────────────────────────────────────────
// Customer Portal Handlers
// ──────────────────────────────────────────────────────────

func (a *appState) handleCustomerGetDashboard(c echo.Context) error {
	ctx := c.Request().Context()
	custIDStr := c.Param("id")
	custID, _ := strconv.Atoi(custIDStr)
	if custID <= 0 {
		return c.String(http.StatusBadRequest, "invalid customer id")
	}

	var data struct {
		Customer customer `json:"customer"`
		Services []struct {
			PlanName      string `json:"planName"`
			BandwidthMbps int    `json:"bandwidthMbps"`
			Active        bool   `json:"active"`
		} `json:"services"`
		Latency int `json:"latency"`
	}

	// Get customer info
	err := a.db.QueryRow(ctx, `SELECT id, name, email, address, workspace_id, device_id, queue_name, COALESCE(monthly_price, 0), username, created_at FROM customers WHERE id = $1`, custID).
		Scan(&data.Customer.ID, &data.Customer.Name, &data.Customer.Email, &data.Customer.Address, &data.Customer.WorkspaceID, &data.Customer.DeviceID, &data.Customer.QueueName, &data.Customer.MonthlyPrice, &data.Customer.Username, &data.Customer.CreatedAt)
	if err != nil {
		return c.String(http.StatusNotFound, "customer not found")
	}

	// Get services
	rows, err := a.db.Query(ctx, `SELECT plan_name, bandwidth_mbps, active FROM services WHERE customer_id = $1`, custID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var s struct {
				PlanName      string `json:"planName"`
				BandwidthMbps int    `json:"bandwidthMbps"`
				Active        bool   `json:"active"`
			}
			if err := rows.Scan(&s.PlanName, &s.BandwidthMbps, &s.Active); err == nil {
				data.Services = append(data.Services, s)
			}
		}
	}

	// Get latest latency if device exists
	if data.Customer.DeviceID != nil && *data.Customer.DeviceID > 0 {
		a.db.QueryRow(ctx, `SELECT COALESCE(latency_ms, 0) FROM device_ping_logs WHERE device_id = $1 ORDER BY created_at DESC LIMIT 1`, *data.Customer.DeviceID).Scan(&data.Latency)
	}

	return c.JSON(http.StatusOK, data)
}

func (a *appState) handleCustomerGetUsage(c echo.Context) error {
	ctx := c.Request().Context()
	custIDStr := c.Param("id")
	custID, _ := strconv.Atoi(custIDStr)

	// Get last 24 hours usage from flow_logs
	// We need customer's IPs from services
	rows, err := a.db.Query(ctx, `
		SELECT captured_at, SUM(bytes) 
		FROM flow_logs 
		WHERE (src_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $1) 
		   OR dst_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $1))
		  AND captured_at >= NOW() - INTERVAL '24 hours'
		GROUP BY captured_at
		ORDER BY captured_at ASC
	`, custID)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to query usage")
	}
	defer rows.Close()

	type Usage struct {
		Time  time.Time `json:"time"`
		Bytes int64     `json:"bytes"`
	}
	var results []Usage
	for rows.Next() {
		var u Usage
		if err := rows.Scan(&u.Time, &u.Bytes); err == nil {
			results = append(results, u)
		}
	}

	return c.JSON(http.StatusOK, results)
}

func (a *appState) handleCustomerGetInvoices(c echo.Context) error {
	ctx := c.Request().Context()
	custIDStr := c.Param("id")
	custID, _ := strconv.Atoi(custIDStr)

	rows, err := a.db.Query(ctx, `SELECT id, period_start, period_end, amount, status, created_at FROM invoices WHERE customer_id = $1 ORDER BY created_at DESC`, custID)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to query invoices")
	}
	defer rows.Close()

	type Invoice struct {
		ID          int       `json:"id"`
		PeriodStart time.Time `json:"periodStart"`
		PeriodEnd   time.Time `json:"periodEnd"`
		Amount      float64   `json:"amount"`
		Status      string    `json:"status"`
		CreatedAt   time.Time `json:"createdAt"`
	}
	var results []Invoice
	for rows.Next() {
		var i Invoice
		if err := rows.Scan(&i.ID, &i.PeriodStart, &i.PeriodEnd, &i.Amount, &i.Status, &i.CreatedAt); err == nil {
			results = append(results, i)
		}
	}

	return c.JSON(http.StatusOK, results)
}
