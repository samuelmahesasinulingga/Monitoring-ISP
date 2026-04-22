package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
)

func main() {
	dsn := "postgres://isp_user:isp_password@localhost:5432/isp_monitoring?sslmode=disable"
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer conn.Close(ctx)

	fmt.Println("Connected to database. Running migration...")

	queries := []string{
		"ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS netflow_monitoring_mode VARCHAR(20) DEFAULT 'continuous';",
		"ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS netflow_snapshot_interval INT DEFAULT 0;",
	}

	for _, q := range queries {
		_, err := conn.Exec(ctx, q)
		if err != nil {
			fmt.Printf("Error executing query [%s]: %v\n", q, err)
		} else {
			fmt.Printf("Executed: %s\n", q)
		}
	}

	fmt.Println("Migration complete.")
}
