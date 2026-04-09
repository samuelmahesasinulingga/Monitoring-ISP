package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"
)

func startPingWorker(state *appState) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	// Melacak waktu terakhir perangkat diping
	lastPingTimes := make(map[int]time.Time)
	// Melacak status terakhir perangkat untuk deteksi perubahan (UP <-> DOWN)
	lastDeviceStatus := make(map[int]string)

	for range ticker.C {
		ctx := context.Background()

		// Ambil semua device yang monitoringnya aktif
		rows, err := state.db.Query(ctx, `
			SELECT id, name, ip, integration_mode, api_port, ping_interval_ms, workspace_id 
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
			WorkspaceID     *int
		}

		var devices []workerDevice
		for rows.Next() {
			var d workerDevice
			if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.IntegrationMode, &d.ApiPort, &d.PingIntervalMs, &d.WorkspaceID); err != nil {
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
					// Deteksi perubahan status untuk Alert
					prevStatus, exists := lastDeviceStatus[dev.ID]
					
					// Alert dikirim jika status berubah (berpindah)
					// ATAU jika ini deteksi pertama kali (server baru nyala) dan statusnya sudah DOWN
					shouldAlert := (exists && prevStatus != status) || (!exists && status == "DOWN")

					if shouldAlert {
						// Status berubah atau deteksi awal DOWN! Kirim Alert (hanya jika workspaceId ada)
						if dev.WorkspaceID != nil {
							go sendStatusAlert(state, *dev.WorkspaceID, dev.Name, status)
						}

						// Simpan ke tabel device_alerts untuk riwayat di dashboard
						go func(id int, s string) {
							_, err := state.db.Exec(context.Background(), "INSERT INTO device_alerts (device_id, status) VALUES ($1, $2)", id, s)
							if err != nil {
								log.Printf("Gagal mencatat Alert ke database untuk device %d: %v", id, err)
							}
						}(dev.ID, status)
					}
					lastDeviceStatus[dev.ID] = status
				}(d, now)

				// Update memory cache
				lastPingTimes[d.ID] = now
			}
		}
	}
}

func sendStatusAlert(state *appState, workspaceID int, deviceName string, newStatus string) {
	ctx := context.Background()
	var botToken, chatID *string
	var alertEnabled bool

	err := state.db.QueryRow(ctx, `
		SELECT telegram_bot_token, telegram_chat_id, alert_enabled 
		FROM workspaces WHERE id = $1
	`, workspaceID).Scan(&botToken, &chatID, &alertEnabled)

	if err != nil {
		log.Printf("Error fetching workspace alert settings for ID %d: %v", workspaceID, err)
		return
	}

	if !alertEnabled || botToken == nil || chatID == nil || *botToken == "" || *chatID == "" {
		return
	}

	emoji := "🟢"
	statusText := "RECOVERED (UP)"
	if newStatus == "DOWN" {
		emoji = "🔴"
		statusText = "DOWN"
	}

	loc := time.FixedZone("WIB", 7*3600)
	msg := fmt.Sprintf("%s *DEVICE ALERT*\n\nDevice: %s\nStatus: %s\nTime: %s", 
		emoji, deviceName, statusText, time.Now().In(loc).Format("15:04:05 02-01-2006"))

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage?chat_id=%s&text=%s&parse_mode=Markdown", 
		*botToken, *chatID, url.QueryEscape(msg))

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("Failed to send telegram alert for device %s: %v", deviceName, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Baca sedikit info error dari body jika bukan 200 OK
		log.Printf("Telegram API ERROR for device %s! Status: %d, URL: %s", deviceName, resp.StatusCode, apiURL)
	} else {
		log.Printf("Telegram Alert SUCCESS for device %s (Status: %s)", deviceName, newStatus)
	}
}
