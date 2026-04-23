package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
)

func (a *appState) handleListServices(c echo.Context) error {
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
			SELECT s.id, s.customer_id, c.name as customer_name, s.plan_name, s.bandwidth_mbps, s.active, s.workspace_id, s.monitoring_ip, s.monitoring_enabled, s.created_at 
			FROM services s
			JOIN customers c ON s.customer_id = c.id
			WHERE s.workspace_id = $1 
			ORDER BY s.id`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `
			SELECT s.id, s.customer_id, c.name as customer_name, s.plan_name, s.bandwidth_mbps, s.active, s.workspace_id, s.monitoring_ip, s.monitoring_enabled, s.created_at 
			FROM services s
			JOIN customers c ON s.customer_id = c.id
			ORDER BY s.id`)
	}
	if err != nil {
		log.Printf("list services query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query services")
	}
	defer rows.Close()

	var services []service
	for rows.Next() {
		var s service
		if err := rows.Scan(&s.ID, &s.CustomerID, &s.CustomerName, &s.PlanName, &s.BandwidthMbps, &s.Active, &s.WorkspaceID, &s.MonitoringIP, &s.MonitoringEnabled, &s.CreatedAt); err != nil {
			log.Printf("scan service error: %v", err)
			continue
		}
		services = append(services, s)
	}
	if services == nil {
		services = []service{}
	}

	return c.JSON(http.StatusOK, services)
}

func (a *appState) handleCreateService(c echo.Context) error {
	ctx := c.Request().Context()

	var req service
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.CustomerID <= 0 || req.PlanName == "" || req.BandwidthMbps <= 0 {
		return c.String(http.StatusBadRequest, "customer_id, plan_name, and bandwidth_mbps are required")
	}

	query := `
		INSERT INTO services (customer_id, plan_name, bandwidth_mbps, active, workspace_id, monitoring_ip, monitoring_enabled)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, customer_id, (SELECT name FROM customers WHERE id = $1), plan_name, bandwidth_mbps, active, workspace_id, monitoring_ip, monitoring_enabled, created_at
	`
	var s service
	err := a.db.QueryRow(ctx, query, req.CustomerID, req.PlanName, req.BandwidthMbps, req.Active, req.WorkspaceID, req.MonitoringIP, req.MonitoringEnabled).
		Scan(&s.ID, &s.CustomerID, &s.CustomerName, &s.PlanName, &s.BandwidthMbps, &s.Active, &s.WorkspaceID, &s.MonitoringIP, &s.MonitoringEnabled, &s.CreatedAt)
	if err != nil {
		log.Printf("create service error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create service")
	}

	return c.JSON(http.StatusCreated, s)
}

func (a *appState) handleUpdateService(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid service id")
	}

	var req service
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	query := `
		UPDATE services 
		SET customer_id = $1, plan_name = $2, bandwidth_mbps = $3, active = $4, workspace_id = $5, monitoring_ip = $6, monitoring_enabled = $7
		WHERE id = $8
		RETURNING id, customer_id, (SELECT name FROM customers WHERE id = $1), plan_name, bandwidth_mbps, active, workspace_id, monitoring_ip, monitoring_enabled, created_at
	`
	var s service
	err = a.db.QueryRow(ctx, query, req.CustomerID, req.PlanName, req.BandwidthMbps, req.Active, req.WorkspaceID, req.MonitoringIP, req.MonitoringEnabled, id).
		Scan(&s.ID, &s.CustomerID, &s.CustomerName, &s.PlanName, &s.BandwidthMbps, &s.Active, &s.WorkspaceID, &s.MonitoringIP, &s.MonitoringEnabled, &s.CreatedAt)

	if err != nil {
		log.Printf("update service error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to update service")
	}

	return c.JSON(http.StatusOK, s)
}

func (a *appState) handleDeleteService(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid service id")
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM services WHERE id = $1`, id)
	if err != nil {
		log.Printf("delete service error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to delete service")
	}
	if cmdTag.RowsAffected() == 0 {
		return c.String(http.StatusNotFound, "service not found")
	}

	return c.NoContent(http.StatusNoContent)
}
