package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
)

func (a *appState) handleListPackages(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")

	var rows pgx.Rows
	var err error

	if wsIDStr != "" {
		wsID, convErr := strconv.Atoi(wsIDStr)
		if convErr != nil || wsID <= 0 {
			return c.String(http.StatusBadRequest, "invalid workspaceId")
		}
		rows, err = a.db.Query(ctx, `SELECT id, name, bandwidth_mbps, price, workspace_id, created_at FROM packages WHERE workspace_id = $1 ORDER BY id`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `SELECT id, name, bandwidth_mbps, price, workspace_id, created_at FROM packages ORDER BY id`)
	}
	if err != nil {
		log.Printf("list packages query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query packages")
	}
	defer rows.Close()

	var pkgs []packageData
	for rows.Next() {
		var p packageData
		if err := rows.Scan(&p.ID, &p.Name, &p.BandwidthMbps, &p.Price, &p.WorkspaceID, &p.CreatedAt); err != nil {
			log.Printf("scan package error: %v", err)
			continue
		}
		pkgs = append(pkgs, p)
	}
	if pkgs == nil {
		pkgs = []packageData{}
	}

	return c.JSON(http.StatusOK, pkgs)
}

func (a *appState) handleCreatePackage(c echo.Context) error {
	ctx := c.Request().Context()

	var req packageData
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" || req.BandwidthMbps <= 0 || req.Price < 0 {
		return c.String(http.StatusBadRequest, "name, valid bandwidth_mbps, and price are required")
	}

	query := `
		INSERT INTO packages (name, bandwidth_mbps, price, workspace_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, bandwidth_mbps, price, workspace_id, created_at
	`
	var p packageData
	err := a.db.QueryRow(ctx, query, req.Name, req.BandwidthMbps, req.Price, req.WorkspaceID).
		Scan(&p.ID, &p.Name, &p.BandwidthMbps, &p.Price, &p.WorkspaceID, &p.CreatedAt)
	if err != nil {
		log.Printf("create package error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create package")
	}

	return c.JSON(http.StatusCreated, p)
}

func (a *appState) handleDeletePackage(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid package id")
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM packages WHERE id = $1`, id)
	if err != nil {
		log.Printf("delete package error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to delete package")
	}
	if cmdTag.RowsAffected() == 0 {
		return c.String(http.StatusNotFound, "package not found")
	}

	return c.NoContent(http.StatusNoContent)
}
