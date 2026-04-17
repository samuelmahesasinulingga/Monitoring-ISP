package main

import (
	"context"
	"log"
	"time"
)

// startBillingAutomationWorker menjalankan loop pengecekan auto-billing
func startBillingAutomationWorker(a *appState) {
	log.Println("Billing automation worker started")
	
	for {
		// Jalankan pengecekan setiap 1 menit (agar akurat tidak perlu menunggu 1 jam bila baru di-setting)
		ctx := context.Background()
		checkAndProcessAutoBilling(ctx, a)
		time.Sleep(1 * time.Minute)
	}
}

func checkAndProcessAutoBilling(ctx context.Context, a *appState) {
	// 1. Cari workspace yang mengaktifkan auto-billing
	query := `
		SELECT id, name, billing_issue_day, billing_issue_hour, last_billing_run_month
		FROM workspaces
		WHERE auto_billing_enabled = TRUE
	`
	rows, err := a.db.Query(ctx, query)
	if err != nil {
		log.Printf("Worker: failed to query workspaces for auto-billing: %v", err)
		return
	}
	defer rows.Close()

	now := time.Now()
	currentDay := now.Day()
	currentMonth := int(now.Month())
	currentHour := now.Hour()

	for rows.Next() {
		var wsID int
		var wsName string
		var issueDay int
		var issueHour int
		var lastRunMonth int
		
		if err := rows.Scan(&wsID, &wsName, &issueDay, &issueHour, &lastRunMonth); err != nil {
			continue
		}

		log.Printf("Worker: checking %s (Target: Day %d Hour %d, Current: Day %d Hour %d, Last Month: %d, Current Month: %d)", wsName, issueDay, issueHour, currentDay, currentHour, lastRunMonth, currentMonth)

		// Jika hari ini adalah hari penagihan DAN jam ini adalah jam penagihan DAN belum dijalankan di bulan ini
		if currentDay == issueDay && currentHour >= issueHour && currentMonth != lastRunMonth {
			log.Printf("Worker: Starting auto-billing for workspace %s (ID: %d)", wsName, wsID)
			
			// A. Buat Invoice Otomatis (berdasarkan history)
			createdIDs, err := a.generateInvoicesForWorkspace(ctx, wsID)
			if err != nil {
				log.Printf("Worker: Failed to generate invoices for %s: %v", wsName, err)
			} else {
				if len(createdIDs) > 0 {
					log.Printf("Worker: Generated %d invoices for %s", len(createdIDs), wsName)
				}
			}

			// B. Cari SEMUA tagihan bulan ini yang BELUM terkirim (termasuk yang dibuat manual)
			periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
			queryUnsent := `
				SELECT id FROM invoices 
				WHERE workspace_id = $1 
				AND period_start = $2 
				AND is_sent = FALSE 
				AND status = 'unpaid'
			`
			rowsUnsent, err := a.db.Query(ctx, queryUnsent, wsID, periodStart)
			if err == nil {
				var unsentIDs []int
				for rowsUnsent.Next() {
					var id int
					if err := rowsUnsent.Scan(&id); err == nil {
						unsentIDs = append(unsentIDs, id)
					}
				}
				rowsUnsent.Close()

				if len(unsentIDs) > 0 {
					log.Printf("Worker: Found %d unsent invoices to process for %s", len(unsentIDs), wsName)
					successCount := 0
					for _, invID := range unsentIDs {
						if err := a.processSendInvoiceEmail(ctx, invID); err != nil {
							log.Printf("Worker: Failed to send email for invoice %d: %v", invID, err)
						} else {
							successCount++
						}
						time.Sleep(2 * time.Second)
					}
					log.Printf("Worker: Successfully sent %d auto-emails for %s", successCount, wsName)
				}
			}

			// C. Update status last_billing_run_month agar tidak jalan lagi hari ini/bulan ini
			_, err = a.db.Exec(ctx, "UPDATE workspaces SET last_billing_run_month = $1 WHERE id = $2", currentMonth, wsID)
			if err != nil {
				log.Printf("Worker: Failed to update last_billing_run_month for %s: %v", wsName, err)
			}
		}
	}
}
