package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

var (
	// Mutex untuk melindungi akses concurrent ke map status
	statusMu sync.RWMutex
)

// escapeMarkdown membersihkan karakter khusus Markdown agar tidak error saat dikirim ke Telegram
func escapeMarkdown(text string) string {
	replacer := strings.NewReplacer(
		"_", "\\_",
		"*", "\\*",
		"[", "\\[",
		"`", "\\`",
	)
	return replacer.Replace(text)
}

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
			SELECT id, name, ip, integration_mode, api_user, api_password, api_port, ping_interval_ms, workspace_id 
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
			ApiUser         string
			ApiPassword     string
			ApiPort         int
			PingIntervalMs  int
			WorkspaceID     *int
		}

		var devices []workerDevice
		for rows.Next() {
			var d workerDevice
			if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.IntegrationMode, &d.ApiUser, &d.ApiPassword, &d.ApiPort, &d.PingIntervalMs, &d.WorkspaceID); err != nil {
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

			statusMu.RLock()
			lastTime := lastPingTimes[d.ID]
			statusMu.RUnlock()

			// Tambahkan buffer ~3 detik agar tidak loss gara gara eksekusi tick
			if now.Sub(lastTime) >= interval-(3*time.Second) || lastTime.IsZero() {
				// Waktunya mencatat log
				go func(dev workerDevice, executeTime time.Time) {
					status := "UP"
					latencyMs := int64(0)

					latency, err := pingDevice(dev.IP, dev.IntegrationMode, dev.ApiPort, dev.ApiUser, dev.ApiPassword)
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
					statusMu.RLock()
					prevStatus, exists := lastDeviceStatus[dev.ID]
					statusMu.RUnlock()
					
					// Alert dikirim jika status berubah (berpindah)
					// ATAU jika ini deteksi pertama kali (server baru nyala) dan statusnya sudah DOWN
					shouldAlert := (exists && prevStatus != status) || (!exists && status == "DOWN")

					if shouldAlert {
						// Status berubah atau deteksi awal DOWN! Kirim Alert (hanya jika workspaceId ada)
						if dev.WorkspaceID != nil {
							go sendStatusAlert(state, *dev.WorkspaceID, dev.Name, status)
						}

						// Simpan ke tabel device_alerts untuk riwayat di dashboard
						go func(id int, s string, t time.Time) {
							_, err := state.db.Exec(context.Background(), "INSERT INTO device_alerts (device_id, status, created_at) VALUES ($1, $2, $3)", id, s, t)
							if err != nil {
								log.Printf("Gagal mencatat Alert ke database untuk device %d: %v", id, err)
							}
						}(dev.ID, status, executeTime)
					}
					statusMu.Lock()
					lastDeviceStatus[dev.ID] = status
					statusMu.Unlock()
				}(d, now)

				// Update memory cache
				statusMu.Lock()
				lastPingTimes[d.ID] = now
				statusMu.Unlock()
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
		emoji, escapeMarkdown(deviceName), statusText, time.Now().In(loc).Format("15:04:05 02-01-2006"))

	payload := map[string]string{
		"chat_id":    *chatID,
		"text":       msg,
		"parse_mode": "Markdown",
	}
	body, _ := json.Marshal(payload)

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", *botToken)

	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("Failed to send telegram alert for device %s: %v", deviceName, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("Telegram API ERROR for device %s! Status: %d, Response: %s", deviceName, resp.StatusCode, string(respBody))
	} else {
		log.Printf("Telegram Alert SUCCESS for device %s (Status: %s)", deviceName, newStatus)
	}
}
