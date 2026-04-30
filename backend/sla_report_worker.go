package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

func startSLAReportWorker(a *appState) {
	log.Println("Starting SLA Report Worker...")
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Printf("Failed to load timezone Asia/Jakarta, falling back to Local: %v", err)
		loc = time.Local
	}

	for {
		<-ticker.C
		now := time.Now().In(loc)

		ctx := context.Background()
		rows, err := a.db.Query(ctx, `
			SELECT id, name, telegram_bot_token, telegram_chat_id, auto_report_period, auto_report_time, sla_report_template, last_auto_report_sent 
			FROM workspaces 
			WHERE auto_report_enabled = TRUE
		`)
		if err != nil {
			log.Printf("SLA Worker query error: %v", err)
			continue
		}

		type wsTask struct {
			id                 int
			name               string
			telegramBotToken   *string
			telegramChatID     *string
			autoReportPeriod   *string
			autoReportTime     *string
			slaReportTemplate  *string
			lastAutoReportSent *time.Time
		}

		var tasks []wsTask
		for rows.Next() {
			var t wsTask
			if err := rows.Scan(&t.id, &t.name, &t.telegramBotToken, &t.telegramChatID, &t.autoReportPeriod, &t.autoReportTime, &t.slaReportTemplate, &t.lastAutoReportSent); err == nil {
				tasks = append(tasks, t)
			}
		}
		rows.Close()

		for _, t := range tasks {
			if t.telegramBotToken == nil || *t.telegramBotToken == "" || t.telegramChatID == nil || *t.telegramChatID == "" {
				continue // No telegram configured
			}

			// Check time (format HH:MM)
			currentTimeStr := now.Format("15:04")
			if t.autoReportTime == nil || *t.autoReportTime != currentTimeStr {
				continue
			}

			// Check period
			shouldRun := false
			period := ""
			if t.autoReportPeriod != nil {
				period = *t.autoReportPeriod
			}
			switch period {
			case "daily":
				shouldRun = true
			case "weekly":
				// Run every Monday
				if now.Weekday() == time.Monday {
					shouldRun = true
				}
			case "monthly":
				// Run on the 1st
				if now.Day() == 1 {
					shouldRun = true
				}
			}

			if !shouldRun {
				continue
			}

			// Check if already sent today
			if t.lastAutoReportSent != nil {
				lastSent := t.lastAutoReportSent.In(loc)
				if lastSent.Year() == now.Year() && lastSent.YearDay() == now.YearDay() {
					continue // Already sent today
				}
			}

			// Execute SLA logic
			go processSLAReport(a, t.id, t.name, *t.telegramBotToken, *t.telegramChatID, period, t.slaReportTemplate, loc)
		}
	}
}

func processSLAReport(a *appState, wsID int, wsName string, botToken string, chatID string, period string, template *string, loc *time.Location) {
	ctx := context.Background()

	// Calculate period duration
	now := time.Now().In(loc)
	var startTime time.Time
	
	switch period {
	case "monthly":
		// previous month
		startTime = now.AddDate(0, -1, 0)
	case "weekly":
		startTime = now.AddDate(0, 0, -7)
	default: // daily
		startTime = now.AddDate(0, 0, -1)
	}

	query := `
		SELECT 
			d.name,
			COUNT(l.id) AS total_logs,
			COUNT(CASE WHEN l.status = 'UP' THEN 1 END) AS up_logs
		FROM devices d
		LEFT JOIN device_ping_logs l ON d.id = l.device_id AND l.created_at >= $2
		WHERE d.workspace_id = $1 AND d.monitoring_enabled = TRUE
		GROUP BY d.id, d.name
	`

	rows, err := a.db.Query(ctx, query, wsID, startTime)
	if err != nil {
		log.Printf("SLA report: Failed to fetch SLA stats: %v", err)
		return
	}
	defer rows.Close()

	totalUptimeSum := 0.0
	validDevices := 0
	details := ""

	for rows.Next() {
		var devName string
		var totalLogs, upLogs int
		if err := rows.Scan(&devName, &totalLogs, &upLogs); err == nil {
			if totalLogs > 0 {
				uptimePct := (float64(upLogs) / float64(totalLogs)) * 100.0
				totalUptimeSum += uptimePct
				validDevices++
				
				if uptimePct < 100.0 {
					details += fmt.Sprintf("🔸 %s: %.2f%%\n", devName, uptimePct)
				}
			}
		}
	}

	if validDevices == 0 {
		// Nothing to report
		return
	}

	avgUptime := totalUptimeSum / float64(validDevices)

	periodMap := map[string]string{
		"daily": "Harian",
		"weekly": "Mingguan",
		"monthly": "Bulanan",
	}

	avgUptimeStr := fmt.Sprintf("%.2f%%", avgUptime)
	totalDevicesStr := fmt.Sprintf("%d", validDevices)

	message := ""
	if template != nil && *template != "" {
		// Custom Template
		message = strings.ReplaceAll(*template, "{{workspace_name}}", wsName)
		message = strings.ReplaceAll(message, "{{period_type}}", periodMap[period])
		message = strings.ReplaceAll(message, "{{start_date}}", startTime.Format("02 Jan 2006"))
		message = strings.ReplaceAll(message, "{{end_date}}", now.Format("02 Jan 2006"))
		message = strings.ReplaceAll(message, "{{avg_uptime}}", avgUptimeStr)
		message = strings.ReplaceAll(message, "{{total_devices}}", totalDevicesStr)
		message = strings.ReplaceAll(message, "{{downtime_details}}", details)
		
		statusNote := ""
		if avgUptime >= 99.0 {
			statusNote = "✅ _Status jaringan terpantau sangat baik._"
		} else if avgUptime >= 95.0 {
			statusNote = "⚠️ _Status jaringan terpantau cukup baik, namun terdapat beberapa masalah._"
		} else {
			statusNote = "❌ _Status jaringan terpantau buruk. Harap segera periksa infrastruktur._"
		}
		message = strings.ReplaceAll(message, "{{status_note}}", statusNote)
	} else {
		// Default Template
		message = fmt.Sprintf("📊 *Laporan SLA %s*\n🏢 *Workspace:* %s\n", periodMap[period], wsName)
		message += fmt.Sprintf("📅 *Periode:* %s - %s\n\n", startTime.Format("02 Jan 2006"), now.Format("02 Jan 2006"))

		message += fmt.Sprintf("📈 *Rata-rata Uptime:* %s\n", avgUptimeStr)
		message += fmt.Sprintf("🖥 *Total Perangkat:* %s\n", totalDevicesStr)

		if details != "" {
			message += "\n*Perangkat dengan Downtime:*\n" + details
		}

		if avgUptime >= 99.0 {
			message += "\n✅ _Status jaringan terpantau sangat baik._"
		} else if avgUptime >= 95.0 {
			message += "\n⚠️ _Status jaringan terpantau cukup baik, namun terdapat beberapa masalah._"
		} else {
			message += "\n❌ _Status jaringan terpantau buruk. Harap segera periksa infrastruktur._"
		}
	}

	sendTelegramReport(botToken, chatID, message)

	// Update last_auto_report_sent
	_, err = a.db.Exec(ctx, `UPDATE workspaces SET last_auto_report_sent = NOW() WHERE id = $1`, wsID)
	if err != nil {
		log.Printf("Failed to update last_auto_report_sent for ws %d: %v", wsID, err)
	}
}

func sendTelegramReport(botToken string, chatID string, text string) {
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "Markdown",
	}

	body, _ := json.Marshal(payload)
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("Telegram auto report error: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Telegram auto report failed with status: %d", resp.StatusCode)
	} else {
		log.Printf("Telegram auto report sent successfully to %s", chatID)
	}
}
