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

	// API Routes — lihat routes.go untuk daftar lengkap
	state.registerRoutes(e)

	// Background Workers
	go startPingWorker(state)
	go startServicePingWorker(state)
	go startSnmpWorker(state)
	go startBillingAutomationWorker(state)
	go startNetFlowCollector(state)
	go startPingAggregatorWorker(state)
	go startSLAReportWorker(state)

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
