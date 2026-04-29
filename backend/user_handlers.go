package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
)

// ──────────────────────────────────────────────────────────
// User Handlers
// ──────────────────────────────────────────────────────────

func (a *appState) handleListUsers(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := a.db.Query(ctx, `
		SELECT id, full_name, email, whatsapp, role, workspace_id, created_at
		FROM users
		ORDER BY id
	`)
	if err != nil {
		log.Printf("list users query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query users")
	}
	defer rows.Close()

	users := make([]user, 0)
	for rows.Next() {
		var u user
		if err := rows.Scan(&u.ID, &u.FullName, &u.Email, &u.Whatsapp, &u.Role, &u.WorkspaceID, &u.CreatedAt); err != nil {
			log.Printf("scan user error: %v", err)
			continue
		}
		users = append(users, u)
	}
	return c.JSON(http.StatusOK, users)
}

func (a *appState) handleCreateUser(c echo.Context) error {
	ctx := c.Request().Context()

	var req createUserRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("create user decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.FullName == "" || req.Email == "" || req.Whatsapp == "" || req.Password == "" || req.Role == "" {
		return c.String(http.StatusBadRequest, "fullName, email, whatsapp, password, and role are required")
	}

	var u user
	query := `
		INSERT INTO users (full_name, email, whatsapp, password, role, workspace_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, full_name, email, whatsapp, role, workspace_id, created_at
	`
	if err := a.db.QueryRow(ctx, query, req.FullName, req.Email, req.Whatsapp, req.Password, req.Role, req.WorkspaceID).
		Scan(&u.ID, &u.FullName, &u.Email, &u.Whatsapp, &u.Role, &u.WorkspaceID, &u.CreatedAt); err != nil {
		log.Printf("create user insert error: %v", err)
		if err.Error() != "" && (strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint")) {
			return c.String(http.StatusConflict, "Email atau nomor WhatsApp sudah terdaftar.")
		}
		return c.String(http.StatusInternalServerError, "failed to create user")
	}

	return c.JSON(http.StatusCreated, u)
}

func (a *appState) handleDeleteUser(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid user id")
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		log.Printf("delete user error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to delete user")
	}
	if cmdTag.RowsAffected() == 0 {
		return c.String(http.StatusNotFound, "user not found")
	}

	return c.NoContent(http.StatusNoContent)
}
