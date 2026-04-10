package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"time"

	"github.com/go-routeros/routeros"
)

func startMikrotikApiWorker(state *appState) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()

		// Ambil semua device yang monitoring API-nya aktif
		rows, err := state.db.Query(ctx, `
			SELECT id, name, ip, api_user, api_password, api_port 
			FROM devices 
			WHERE monitoring_enabled = TRUE AND integration_mode ILIKE '%api%'
		`)
		if err != nil {
			log.Printf("api worker query devices error: %v", err)
			continue
		}

		type apiDevice struct {
			ID       int
			Name     string
			IP       string
			User     string
			Password string
			Port     int
		}

		var devices []apiDevice
		for rows.Next() {
			var d apiDevice
			if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.User, &d.Password, &d.Port); err != nil {
				continue
			}
			devices = append(devices, d)
		}
		rows.Close()

		for _, d := range devices {
			go pollDeviceQueueRouterOS(state, d)
		}
	}
}

func pollDeviceQueueRouterOS(state *appState, d struct {
	ID       int
	Name     string
	IP       string
	User     string
	Password string
	Port     int
}) {
	addr := fmt.Sprintf("%s:%d", d.IP, d.Port)
	conn_tcp, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		log.Printf("Mikrotik TCP connect error for %s (%s): %v", d.Name, d.IP, err)
		return
	}
	conn, err := routeros.NewClient(conn_tcp)
	if err != nil {
		log.Printf("Mikrotik client init error for %s (%s): %v", d.Name, d.IP, err)
		conn_tcp.Close()
		return
	}
	defer conn.Close()

	if err := conn.Login(d.User, d.Password); err != nil {
		log.Printf("Mikrotik API login error for %s (%s): %v", d.Name, d.IP, err)
		return
	}

	reply, err := conn.Run("/queue/simple/print")
	if err != nil {
		log.Printf("Mikrotik API query error for %s: %v", d.Name, err)
		return
	}

	now := time.Now()
	for _, re := range reply.Re {
		name := re.Map["name"]
		bytesStr := re.Map["bytes"] // Format "bytes_in/bytes_out"

		if name == "" || bytesStr == "" {
			continue
		}

		var bytesIn, bytesOut uint64
		fmt.Sscanf(bytesStr, "%d/%d", &bytesIn, &bytesOut)

		_, err = state.db.Exec(context.Background(), `
			INSERT INTO device_queue_logs (device_id, queue_name, bytes_in, bytes_out, created_at)
			VALUES ($1, $2, $3, $4, $5)
		`, d.ID, name, bytesIn, bytesOut, now)

		if err != nil {
			log.Printf("gagal simpan API log untuk %s queue %s: %v", d.Name, name, err)
		}
	}
}
