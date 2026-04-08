package main

import (
	"context"
	"log"
	"time"
)

func startPingWorker(state *appState) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	// Melacak waktu terakhir perangkat diping (agar tidak query yang kelewat batas jika banyak sekali)
	// Key: device ID, Value: timestamp terakhir ping sukses/gagal dicatat
	lastPingTimes := make(map[int]time.Time)

	for range ticker.C {
		ctx := context.Background()

		// Ambil semua device yang monitoringnya aktif
		rows, err := state.db.Query(ctx, `
			SELECT id, name, ip, integration_mode, api_port, ping_interval_ms 
			FROM devices 
			WHERE monitoring_enabled = TRUE
		`)
		if err != nil {
			log.Printf("worker query devices error: %v", err)
			continue
		}

		type workerDevice struct {
			ID              int
			Name            string
			IP              string
			IntegrationMode string
			ApiPort         int
			PingIntervalMs  int
		}

		var devices []workerDevice
		for rows.Next() {
			var d workerDevice
			if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.IntegrationMode, &d.ApiPort, &d.PingIntervalMs); err != nil {
				continue
			}
			devices = append(devices, d)
		}
		rows.Close()

		now := time.Now()

		for _, d := range devices {
			interval := time.Duration(d.PingIntervalMs) * time.Millisecond
			if interval <= 0 {
				interval = 30 * time.Second
			}

			lastTime := lastPingTimes[d.ID]
			// Tambahkan buffer ~3 detik agar tidak loss gara gara eksekusi tick
			if now.Sub(lastTime) >= interval-(3*time.Second) || lastTime.IsZero() {
				// Waktunya mencatat log
				go func(dev workerDevice, executeTime time.Time) {
					status := "UP"
					latencyMs := int64(0)

					latency, err := pingDevice(dev.IP, dev.IntegrationMode, dev.ApiPort)
					if err != nil {
						status = "DOWN"
					} else {
						latencyMs = latency.Milliseconds()
					}

					// Insert log
					_, err = state.db.Exec(context.Background(), `
						INSERT INTO device_ping_logs (device_id, latency_ms, status, created_at)
						VALUES ($1, $2, $3, $4)
					`, dev.ID, latencyMs, status, executeTime)

					if err != nil {
						log.Printf("gagal insert log ping untuk device %d: %v", dev.ID, err)
					}
				}(d, now)

				// Update memory cache
				lastPingTimes[d.ID] = now
			}
		}
	}
}
