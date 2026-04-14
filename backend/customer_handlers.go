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
		rows, err = a.db.Query(ctx, `SELECT id, name, email, address, workspace_id, created_at FROM customers WHERE workspace_id = $1 ORDER BY id`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `SELECT id, name, email, address, workspace_id, created_at FROM customers ORDER BY id`)
	}
	if err != nil {
		log.Printf("list customers query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query customers")
	}
	defer rows.Close()

	var customers []customer
	for rows.Next() {
		var cu customer
		if err := rows.Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.WorkspaceID, &cu.CreatedAt); err != nil {
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
		INSERT INTO customers (name, email, address, workspace_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, email, address, workspace_id, created_at
	`
	var cu customer
	err := a.db.QueryRow(ctx, query, req.Name, req.Email, req.Address, req.WorkspaceID).
		Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.WorkspaceID, &cu.CreatedAt)
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
		SET name = $1, email = $2, address = $3
		WHERE id = $4
		RETURNING id, name, email, address, workspace_id, created_at
	`
	var cu customer
	err = a.db.QueryRow(ctx, query, req.Name, req.Email, req.Address, id).
		Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Address, &cu.WorkspaceID, &cu.CreatedAt)
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
