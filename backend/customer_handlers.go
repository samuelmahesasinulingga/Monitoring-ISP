package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

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
		rows, err = a.db.Query(ctx, `SELECT id, name, email, address, workspace_id, device_id, queue_name, monthly_price, created_at FROM customers WHERE workspace_id = $1 ORDER BY id`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `SELECT id, name, email, address, workspace_id, device_id, queue_name, monthly_price, created_at FROM customers ORDER BY id`)
	}
	if err != nil {
		log.Printf("list customers query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query customers")
	}
	defer rows.Close()

	var customers []customer
	for rows.Next() {
		var cu customer
		if err := rows.Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.WorkspaceID, &cu.DeviceID, &cu.QueueName, &cu.MonthlyPrice, &cu.CreatedAt); err != nil {
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
		INSERT INTO customers (name, email, address, workspace_id, device_id, queue_name, monthly_price)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, email, address, workspace_id, device_id, queue_name, monthly_price, created_at
	`
	var cu customer
	err := a.db.QueryRow(ctx, query, req.Name, req.Email, req.Address, req.WorkspaceID, req.DeviceID, req.QueueName, req.MonthlyPrice).
		Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.WorkspaceID, &cu.DeviceID, &cu.QueueName, &cu.MonthlyPrice, &cu.CreatedAt)
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
		SET name = $1, email = $2, address = $3, device_id = $4, queue_name = $5, monthly_price = $6
		WHERE id = $7
		RETURNING id, name, email, address, workspace_id, device_id, queue_name, monthly_price, created_at
	`
	var cu customer
	err = a.db.QueryRow(ctx, query, req.Name, req.Email, req.Address, req.DeviceID, req.QueueName, req.MonthlyPrice, id).
		Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.WorkspaceID, &cu.DeviceID, &cu.QueueName, &cu.MonthlyPrice, &cu.CreatedAt)
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
