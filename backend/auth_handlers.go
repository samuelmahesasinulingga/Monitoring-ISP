package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
)

// ──────────────────────────────────────────────────────────
// Auth Handler
// ──────────────────────────────────────────────────────────

func (a *appState) handleLogin(c echo.Context) error {
	ctx := c.Request().Context()

	var req loginRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("login decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Email == "" || req.Password == "" {
		return c.String(http.StatusBadRequest, "email and password are required")
	}

	// 1) Coba autentikasi sebagai admin super
	var adm admin
	err := a.db.QueryRow(
		ctx,
		`SELECT id, email, password, role, created_at FROM admins WHERE email = $1`,
		req.Email,
	).Scan(&adm.ID, &adm.Email, &adm.Password, &adm.Role, &adm.CreatedAt)
	if err == nil {
		if req.Password != adm.Password {
			log.Printf("login failed for admin email=%s: wrong password", req.Email)
			return c.String(http.StatusUnauthorized, "email atau password salah")
		}
		log.Printf("login success as admin: %s (role=%s)", adm.Email, adm.Role)
		return c.JSON(http.StatusOK, loginResponse{Email: adm.Email, Role: adm.Role})
	}
	if err != nil && err != pgx.ErrNoRows {
		log.Printf("login admin query error for %s: %v", req.Email, err)
		return c.String(http.StatusUnauthorized, "email atau password salah")
	}

	// 2) Jika bukan admin, coba autentikasi sebagai user (tabel users)
	var userID int
	var userEmail, userPassword, userRole string
	var userWorkspaceID *int
	var userCreatedAt time.Time
	var wsName, wsAddress *string
	err = a.db.QueryRow(
		ctx,
		`SELECT u.id, u.email, u.password, u.role, u.workspace_id, u.created_at, w.name, w.address
		 FROM users u
		 LEFT JOIN workspaces w ON w.id = u.workspace_id
		 WHERE u.email = $1`,
		req.Email,
	).Scan(&userID, &userEmail, &userPassword, &userRole, &userWorkspaceID, &userCreatedAt, &wsName, &wsAddress)
	if err != nil {
		if err != pgx.ErrNoRows {
			log.Printf("login user query error for %s: %v", req.Email, err)
		}
		return c.String(http.StatusUnauthorized, "email atau password salah")
	}

	if req.Password != userPassword {
		log.Printf("login failed for user email=%s: wrong password", req.Email)
		return c.String(http.StatusUnauthorized, "email atau password salah")
	}

	log.Printf("login success as user: %s (role=%s, workspaceID=%v)", userEmail, userRole, userWorkspaceID)
	return c.JSON(http.StatusOK, loginResponse{
		Email:            userEmail,
		Role:             userRole,
		WorkspaceID:      userWorkspaceID,
		WorkspaceName:    wsName,
		WorkspaceAddress: wsAddress,
	})
}
