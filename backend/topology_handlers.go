package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

func (a *appState) handleGetTopology(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	workspaceId, err := strconv.Atoi(idStr)
	if err != nil || workspaceId <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	var data TopologyData

	// Get Nodes
	nodeRows, err := a.db.Query(ctx, "SELECT id, device_id, type, label, x, y, created_at FROM topology_nodes WHERE workspace_id = $1", workspaceId)
	if err != nil {
		log.Printf("get topology nodes error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to get topology nodes")
	}
	defer nodeRows.Close()

	for nodeRows.Next() {
		var n TopologyNode
		n.WorkspaceID = workspaceId
		if err := nodeRows.Scan(&n.ID, &n.DeviceID, &n.Type, &n.Label, &n.X, &n.Y, &n.CreatedAt); err != nil {
			log.Printf("scan topology node error: %v", err)
			continue
		}
		data.Nodes = append(data.Nodes, n)
	}

	// Get Edges
	edgeRows, err := a.db.Query(ctx, "SELECT id, source_id, target_id, label, created_at FROM topology_edges WHERE workspace_id = $1", workspaceId)
	if err != nil {
		log.Printf("get topology edges error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to get topology edges")
	}
	defer edgeRows.Close()

	for edgeRows.Next() {
		var e TopologyEdge
		e.WorkspaceID = workspaceId
		if err := edgeRows.Scan(&e.ID, &e.Source, &e.Target, &e.Label, &e.CreatedAt); err != nil {
			log.Printf("scan topology edge error: %v", err)
			continue
		}
		data.Edges = append(data.Edges, e)
	}

	return c.JSON(http.StatusOK, data)
}

func (a *appState) handleSaveTopology(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	workspaceId, err := strconv.Atoi(idStr)
	if err != nil || workspaceId <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	var req TopologyData
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("save topology decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	// Use a transaction
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to start transaction")
	}
	defer tx.Rollback(ctx)

	// 1. Delete old data
	_, _ = tx.Exec(ctx, "DELETE FROM topology_edges WHERE workspace_id = $1", workspaceId)
	_, _ = tx.Exec(ctx, "DELETE FROM topology_nodes WHERE workspace_id = $1", workspaceId)

	// 2. Insert Nodes
	for _, n := range req.Nodes {
		_, err = tx.Exec(ctx, `
			INSERT INTO topology_nodes (id, workspace_id, device_id, type, label, x, y)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, n.ID, workspaceId, n.DeviceID, n.Type, n.Label, n.X, n.Y)
		if err != nil {
			log.Printf("insert node error: %v", err)
			return c.String(http.StatusInternalServerError, "failed to save node")
		}
	}

	// 3. Insert Edges
	for _, e := range req.Edges {
		_, err = tx.Exec(ctx, `
			INSERT INTO topology_edges (id, workspace_id, source_id, target_id, label)
			VALUES ($1, $2, $3, $4, $5)
		`, e.ID, workspaceId, e.Source, e.Target, e.Label)
		if err != nil {
			log.Printf("insert edge error: %v", err)
			return c.String(http.StatusInternalServerError, "failed to save edge")
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return c.String(http.StatusInternalServerError, "failed to commit transaction")
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "success"})
}
