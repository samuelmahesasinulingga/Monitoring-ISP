package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

type appState struct {
	db *pgxpool.Pool
}

func main() {
	ctx := context.Background()

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s",
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

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Monitoring summary (contoh sederhana)
	r.Get("/api/monitoring/summary", state.handleMonitoringSummary)

	// Contoh endpoint: list pelanggan dari PostgreSQL
	r.Get("/api/customers", state.handleListCustomers)

	log.Println("Backend running on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatal(err)
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

type customer struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     *string   `json:"email,omitempty"`
	Address   *string   `json:"address,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func (a *appState) handleMonitoringSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var totalCustomers int
	if err := a.db.QueryRow(ctx, "SELECT COUNT(*) FROM customers").Scan(&totalCustomers); err != nil {
		log.Printf("monitoring summary query error: %v", err)
	}

	resp := map[string]any{
		"status":          "ok",
		"message":         "Monitoring API ready",
		"total_customers": totalCustomers,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (a *appState) handleListCustomers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := a.db.Query(ctx, `SELECT id, name, email, address, created_at FROM customers ORDER BY id LIMIT 100`)
	if err != nil {
		log.Printf("list customers query error: %v", err)
		http.Error(w, "failed to query customers", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var customers []customer
	for rows.Next() {
		var c customer
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Address, &c.CreatedAt); err != nil {
			log.Printf("scan customer error: %v", err)
			continue
		}
		customers = append(customers, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(customers)
}

