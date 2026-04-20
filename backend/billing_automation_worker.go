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
		SELECT id, name, billing_issue_day, billing_issue_hour, billing_issue_minute, last_billing_run_month
		FROM workspaces
		WHERE auto_billing_enabled = TRUE
	`
	rows, err := a.db.Query(ctx, query)
	if err != nil {
		log.Printf("Worker: failed to query workspaces for auto-billing: %v", err)
		return
	}
	defer rows.Close()

	loc, _ := time.LoadLocation("Asia/Jakarta")
	if loc == nil {
		loc = time.FixedZone("WIB", 7*3600)
	}
	now := time.Now().In(loc)
	currentDay := now.Day()
	currentMonth := int(now.Month())
	currentHour := now.Hour()
	currentMinute := now.Minute()

	for rows.Next() {
		var wsID int
		var wsName string
		var issueDay int
		var issueHour int
		var issueMinute int
		var lastRunMonth int
		
		if err := rows.Scan(&wsID, &wsName, &issueDay, &issueHour, &issueMinute, &lastRunMonth); err != nil {
			continue
		}

		// Check if we hit the target time
		isTargetTimeReached := currentHour > issueHour || (currentHour == issueHour && currentMinute >= issueMinute)

		// Jalankan jika:
		// 1. Hari ini adalah hari penagihan
		// 2. Jam/menit target sudah terlewati
		if currentDay == issueDay && isTargetTimeReached {
			// Cek apakah sudah pernah sukses bulan ini?
			shouldRun := lastRunMonth != currentMonth
			
			periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)

			// Jika sudah pernah sukses, tetap cek apakah ada invoice baru yang belum terkirim?
			if !shouldRun {
				var unsentCount int
				err := a.db.QueryRow(ctx, "SELECT COUNT(*) FROM invoices WHERE workspace_id = $1 AND period_start = $2 AND is_sent = FALSE", wsID, periodStart).Scan(&unsentCount)
				if err == nil && unsentCount > 0 {
					shouldRun = true
				}
			}

			if shouldRun {
				log.Printf("Worker: Processing auto-billing for %s (Target Time Reached)", wsName)
				
				// A. Buat Invoice Otomatis (berdasarkan history)
				newIDs, err := a.generateInvoicesForWorkspace(ctx, wsID)
				if err == nil && len(newIDs) > 0 {
					log.Printf("Worker: Generated %d invoices for %s", len(newIDs), wsName)
				}

				// B. Cari SEMUA tagihan bulan ini yang BELUM terkirim
				queryUnsent := `
					SELECT id FROM invoices 
					WHERE workspace_id = $1 
					AND period_start = $2 
					AND is_sent = FALSE
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
						log.Printf("Worker: Found %d unsent invoices for %s", len(unsentIDs), wsName)
						for _, invID := range unsentIDs {
							if err := a.processSendInvoiceEmail(ctx, invID); err != nil {
								log.Printf("Worker: Failed to send invoice %d: %v", invID, err)
							}
							time.Sleep(1 * time.Second)
						}
					}
				}

				// C. Update last_billing_run_month
				_, _ = a.db.Exec(ctx, "UPDATE workspaces SET last_billing_run_month = $1 WHERE id = $2", currentMonth, wsID)
			}
		}
	}
}
