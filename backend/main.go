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

	// DSN format: postgres://user:password@host:port/dbname?sslmode=disable
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

	// Run migrations
	if err := runMigrations(dsn); err != nil {
		log.Printf("Migration error: %v", err)
		// We don't necessarily want to fatal if migrations fail during dev,
		// but in production it's safer. Let's fatal to ensure consistency.
		log.Fatalf("migrations failed: %v", err)
	}

	state := &appState{db: pool}

	// Create uploads directory if it doesn't exist
	os.MkdirAll("uploads/proofs", 0755)

	e := echo.New()

	// Static files
	e.Static("/uploads", "uploads")

	// Middleware
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

	// API Routes
	// Auth
	e.POST("/api/login", state.handleLogin)

	// Workspace management
	e.POST("/api/workspaces", state.handleCreateWorkspace)
	e.GET("/api/workspaces", state.handleListWorkspaces)
	e.PUT("/api/workspaces/:id", state.handleUpdateWorkspace)
	e.PUT("/api/workspaces/:id/settings", state.handleUpdateWorkspaceSettings)
	e.PUT("/api/workspaces/:id/smtp", state.handleUpdateWorkspaceSmtpSettings)
	e.DELETE("/api/workspaces/:id", state.handleDeleteWorkspace)
	e.POST("/api/settings/test-smtp", state.handleTestSMTP)

	// Users management
	e.POST("/api/users", state.handleCreateUser)
	e.GET("/api/users", state.handleListUsers)
	e.DELETE("/api/users/:id", state.handleDeleteUser)

	// Devices management
	e.POST("/api/devices", state.handleCreateDevice)
	e.GET("/api/devices", state.handleListDevices)
	e.PUT("/api/devices/:id", state.handleUpdateDevice)
	e.DELETE("/api/devices/:id", state.handleDeleteDevice)
	e.POST("/api/devices/test-connection", state.handleTestDeviceConnection)

	// Monitoring & Traffic
	e.GET("/api/monitoring/ping", state.handlePingDevices)
	e.GET("/api/monitoring/ping-logs/:id", state.handleGetDevicePingLogs)
	e.PUT("/api/devices/:id/ping-interval", state.handleUpdatePingInterval)
	e.GET("/api/monitoring/interfaces/:id", state.handleListDeviceInterfaces)
	e.GET("/api/monitoring/traffic/:id", state.handleGetInterfaceTraffic)
	e.GET("/api/monitoring/queues/:id", state.handleListDeviceQueues)
	e.GET("/api/monitoring/queue-traffic/:id", state.handleGetQueueTraffic)
	e.GET("/api/monitoring/summary", state.handleMonitoringSummary)
	e.GET("/api/monitoring/alerts", state.handleGetAlerts)

	// Topology Component
	e.GET("/api/workspaces/:id/topology-layouts", state.handleGetTopologyLayouts)
	e.POST("/api/workspaces/:id/topology-layouts", state.handleCreateTopologyLayout)
	e.DELETE("/api/workspaces/:id/topology-layouts/:layoutId", state.handleDeleteTopologyLayout)
	e.GET("/api/workspaces/:id/topology-layouts/:layoutId/data", state.handleGetTopology)
	e.POST("/api/workspaces/:id/topology-layouts/:layoutId/data", state.handleSaveTopology)

	// Customers Component
	e.GET("/api/customers", state.handleListCustomers)
	e.POST("/api/customers", state.handleCreateCustomer)
	e.PUT("/api/customers/:id", state.handleUpdateCustomer)
	e.DELETE("/api/customers/:id", state.handleDeleteCustomer)

	// Invoices Component
	e.GET("/api/invoices", state.handleListInvoices)
	e.POST("/api/invoices", state.handleCreateInvoice)
	e.PUT("/api/invoices/:id/status", state.handleUpdateInvoiceStatus)
	e.POST("/api/invoices/:id/send-email", state.handleSendInvoiceEmail)
	e.DELETE("/api/invoices/:id", state.handleDeleteInvoice)

	// Packages Component
	e.GET("/api/packages", state.handleListPackages)
	e.POST("/api/packages", state.handleCreatePackage)
	e.DELETE("/api/packages/:id", state.handleDeletePackage)

	e.POST("/api/services", state.handleCreateService)
	e.DELETE("/api/services/:id", state.handleDeleteService)

	e.GET("/api/analytics/top-talkers", state.handleGetTopTalkers)
	e.GET("/api/analytics/top-protocols", state.handleGetProtocolBreakdown)
	e.GET("/api/analytics/flow-logs", state.handleGetFlowLogs)
	e.GET("/api/analytics/active-devices", state.handleGetActiveAnalyticsDevices)
	e.GET("/api/monitoring/sla-stats", state.handleGetSLAStats)

	go startPingWorker(state)
	go startSnmpWorker(state)
	go startBillingAutomationWorker(state)
	go startNetFlowCollector(state)

	log.Println("Backend running on :8080")
	e.Logger.Fatal(e.Start(":8080"))
}

// Helper to get environment variables with default values
func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
