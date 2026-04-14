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
		rows, err = a.db.Query(ctx, `SELECT id, customer_id, plan_name, bandwidth_mbps, active, workspace_id, created_at FROM services WHERE workspace_id = $1 ORDER BY id`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `SELECT id, customer_id, plan_name, bandwidth_mbps, active, workspace_id, created_at FROM services ORDER BY id`)
	}
	if err != nil {
		log.Printf("list services query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query services")
	}
	defer rows.Close()

	var services []service
	for rows.Next() {
		var s service
		if err := rows.Scan(&s.ID, &s.CustomerID, &s.PlanName, &s.BandwidthMbps, &s.Active, &s.WorkspaceID, &s.CreatedAt); err != nil {
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
		INSERT INTO services (customer_id, plan_name, bandwidth_mbps, active, workspace_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, customer_id, plan_name, bandwidth_mbps, active, workspace_id, created_at
	`
	var s service
	err := a.db.QueryRow(ctx, query, req.CustomerID, req.PlanName, req.BandwidthMbps, req.Active, req.WorkspaceID).
		Scan(&s.ID, &s.CustomerID, &s.PlanName, &s.BandwidthMbps, &s.Active, &s.WorkspaceID, &s.CreatedAt)
	if err != nil {
		log.Printf("create service error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create service")
	}

	return c.JSON(http.StatusCreated, s)
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
