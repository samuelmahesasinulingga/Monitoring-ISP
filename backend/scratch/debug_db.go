package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dsn := "postgres://isp_user:isp_password@localhost:5432/isp_monitoring?sslmode=disable"

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	rows, err := pool.Query(context.Background(), "SELECT id, name, workspace_id FROM devices")
	if err != nil {
		log.Fatalf("Query failed: %v\n", err)
	}
	defer rows.Close()

	fmt.Println("Devices in DB:")
	count := 0
	for rows.Next() {
		var id, wsID int
		var name string
		if err := rows.Scan(&id, &name, &wsID); err == nil {
			fmt.Printf("ID: %d, Name: %s, WorkspaceID: %d\n", id, name, wsID)
			count++
		}
	}
	if count == 0 {
		fmt.Println("No devices found in DB.")
	}
}
