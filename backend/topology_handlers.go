package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

// handleGetTopologyLayouts fetches all layouts for a workspace
func (a *appState) handleGetTopologyLayouts(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	workspaceId, err := strconv.Atoi(idStr)
	if err != nil || workspaceId <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	rows, err := a.db.Query(ctx, "SELECT id, workspace_id, name, created_at FROM topology_layouts WHERE workspace_id = $1 ORDER BY created_at DESC", workspaceId)
	if err != nil {
		log.Printf("get topology layouts error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to get layouts")
	}
	defer rows.Close()

	var layouts []TopologyLayout
	for rows.Next() {
		var l TopologyLayout
		if err := rows.Scan(&l.ID, &l.WorkspaceID, &l.Name, &l.CreatedAt); err == nil {
			layouts = append(layouts, l)
		}
	}

	if layouts == nil {
		layouts = []TopologyLayout{}
	}

	return c.JSON(http.StatusOK, layouts)
}

// handleCreateTopologyLayout creates a new layout for a workspace
func (a *appState) handleCreateTopologyLayout(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	workspaceId, err := strconv.Atoi(idStr)
	if err != nil || workspaceId <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil || req.Name == "" {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	var l TopologyLayout
	err = a.db.QueryRow(ctx, "INSERT INTO topology_layouts (workspace_id, name) VALUES ($1, $2) RETURNING id, workspace_id, name, created_at", workspaceId, req.Name).Scan(&l.ID, &l.WorkspaceID, &l.Name, &l.CreatedAt)
	if err != nil {
		log.Printf("create topology layout error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create layout")
	}

	return c.JSON(http.StatusOK, l)
}

// handleDeleteTopologyLayout deletes a layout and its nodes/edges 
func (a *appState) handleDeleteTopologyLayout(c echo.Context) error {
	ctx := c.Request().Context()
	
	layoutIdStr := c.Param("layoutId")
	layoutId, err := strconv.Atoi(layoutIdStr)
	if err != nil || layoutId <= 0 {
		return c.String(http.StatusBadRequest, "invalid layout id")
	}

	_, err = a.db.Exec(ctx, "DELETE FROM topology_layouts WHERE id = $1", layoutId)
	if err != nil {
		log.Printf("delete topology layout error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to delete layout")
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "success"})
}

func (a *appState) handleGetTopology(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	workspaceId, err := strconv.Atoi(idStr)
	if err != nil || workspaceId <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	layoutIdStr := c.Param("layoutId")
	layoutId, err := strconv.Atoi(layoutIdStr)
	if err != nil || layoutId <= 0 {
		return c.String(http.StatusBadRequest, "invalid layout id")
	}

	var data TopologyData
	data.Nodes = []TopologyNode{}
	data.Edges = []TopologyEdge{}

	// Get Nodes
	nodeRows, err := a.db.Query(ctx, "SELECT id, device_id, type, label, vendor, x, y, created_at FROM topology_nodes WHERE layout_id = $1", layoutId)
	if err != nil {
		log.Printf("get topology nodes error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to get topology nodes")
	}
	defer nodeRows.Close()

	for nodeRows.Next() {
		var n TopologyNode
		n.WorkspaceID = workspaceId
		n.LayoutID = layoutId
		if err := nodeRows.Scan(&n.ID, &n.DeviceID, &n.Type, &n.Label, &n.Vendor, &n.X, &n.Y, &n.CreatedAt); err != nil {
			log.Printf("scan topology node error: %v", err)
			continue
		}
		data.Nodes = append(data.Nodes, n)
	}

	// Get Edges
	edgeRows, err := a.db.Query(ctx, "SELECT id, source_id, target_id, label, link_type, animated, created_at FROM topology_edges WHERE layout_id = $1", layoutId)
	if err != nil {
		log.Printf("get topology edges error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to get topology edges")
	}
	defer edgeRows.Close()

	for edgeRows.Next() {
		var e TopologyEdge
		e.WorkspaceID = workspaceId
		e.LayoutID = layoutId
		if err := edgeRows.Scan(&e.ID, &e.Source, &e.Target, &e.Label, &e.LinkType, &e.Animated, &e.CreatedAt); err != nil {
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

	layoutIdStr := c.Param("layoutId")
	layoutId, err := strconv.Atoi(layoutIdStr)
	if err != nil || layoutId <= 0 {
		return c.String(http.StatusBadRequest, "invalid layout id")
	}

	var req TopologyData
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("save topology decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	tx, err := a.db.Begin(ctx)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to start transaction")
	}
	defer tx.Rollback(ctx)

	// 1. Delete old data for this layout
	_, _ = tx.Exec(ctx, "DELETE FROM topology_edges WHERE layout_id = $1", layoutId)
	_, _ = tx.Exec(ctx, "DELETE FROM topology_nodes WHERE layout_id = $1", layoutId)

	// 2. Insert Nodes
	for _, n := range req.Nodes {
		_, err = tx.Exec(ctx, `
			INSERT INTO topology_nodes (id, workspace_id, layout_id, device_id, type, label, vendor, x, y)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`, n.ID, workspaceId, layoutId, n.DeviceID, n.Type, n.Label, n.Vendor, n.X, n.Y)
		if err != nil {
			log.Printf("insert node error: %v", err)
			return c.String(http.StatusInternalServerError, "failed to save node")
		}
	}

	// 3. Insert Edges
	for _, e := range req.Edges {
		_, err = tx.Exec(ctx, `
			INSERT INTO topology_edges (id, workspace_id, layout_id, source_id, target_id, label, link_type, animated)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, e.ID, workspaceId, layoutId, e.Source, e.Target, e.Label, e.LinkType, e.Animated)
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
