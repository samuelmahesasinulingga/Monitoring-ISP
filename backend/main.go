package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type appState struct {
	db *pgxpool.Pool
}

func main() {
	ctx := context.Background()

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		getEnv("POSTGRES_USER", "isp_user"),
		getEnv("POSTGRES_PASSWORD", "isp_password"),
		getEnv("POSTGRES_HOST", "localhost"),
		getEnv("POSTGRES_PORT", "5432"),
		getEnv("POSTGRES_DB", "isp_monitoring"),
	)

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("failed to create db pool: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("cannot connect to database: %v", err)
	}

	state := &appState{db: pool}

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{"Content-Type", "Authorization"},
	}))

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.String(http.StatusOK, "OK")
	})

	// Auth: login super admin / admin workspace
	e.POST("/api/login", state.handleLogin)

	// Workspace management
	e.POST("/api/workspaces", state.handleCreateWorkspace)
	e.GET("/api/workspaces", state.handleListWorkspaces)
	e.PUT("/api/workspaces/:id", state.handleUpdateWorkspace)
	e.DELETE("/api/workspaces/:id", state.handleDeleteWorkspace)

	// Users management
	e.GET("/api/users", state.handleListUsers)
	e.POST("/api/users", state.handleCreateUser)
	e.DELETE("/api/users/:id", state.handleDeleteUser)

	// Devices management
	e.GET("/api/devices", state.handleListDevices)
	e.POST("/api/devices", state.handleCreateDevice)
	e.PUT("/api/devices/:id", state.handleUpdateDevice)
	e.DELETE("/api/devices/:id", state.handleDeleteDevice)
	e.POST("/api/devices/test-connection", state.handleTestDeviceConnection)

	// Monitoring summary (contoh sederhana)
	e.GET("/api/monitoring/summary", state.handleMonitoringSummary)
	e.GET("/api/monitoring/ping", state.handlePingDevices)
	e.GET("/api/monitoring/ping-logs/:id", state.handleGetDevicePingLogs)
	e.PUT("/api/devices/:id/ping-interval", state.handleUpdatePingInterval)
	e.GET("/api/monitoring/interfaces/:id", state.handleListDeviceInterfaces)
	e.GET("/api/monitoring/traffic/:id", state.handleGetInterfaceTraffic)

	// Contoh endpoint: list pelanggan dari PostgreSQL
	e.GET("/api/customers", state.handleListCustomers)

	// Jalankan background workers
	go startPingWorker(state)
	go startSnmpWorker(state)

	log.Println("Backend running on :8080")
	e.Logger.Fatal(e.Start(":8080"))
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
