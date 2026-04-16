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
		// Jalankan pengecekan setiap 1 jam
		ctx := context.Background()
		checkAndProcessAutoBilling(ctx, a)
		
		time.Sleep(1 * time.Hour)
	}
}

func checkAndProcessAutoBilling(ctx context.Context, a *appState) {
	// 1. Cari workspace yang mengaktifkan auto-billing
	query := `
		SELECT id, name, billing_issue_day, last_billing_run_month
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

	for rows.Next() {
		var wsID int
		var wsName string
		var issueDay int
		var lastRunMonth int
		
		if err := rows.Scan(&wsID, &wsName, &issueDay, &lastRunMonth); err != nil {
			continue
		}

		// Jika hari ini adalah hari penagihan DAN belum dijalankan di bulan ini
		if currentDay == issueDay && currentMonth != lastRunMonth {
			log.Printf("Worker: Starting auto-billing for workspace %s (ID: %d)", wsName, wsID)
			
			// A. Buat Invoice
			createdIDs, err := a.generateInvoicesForWorkspace(ctx, wsID)
			if err != nil {
				log.Printf("Worker: Failed to generate invoices for %s: %v", wsName, err)
				continue
			}

			log.Printf("Worker: Generated %d invoices for %s", len(createdIDs), wsName)

			// B. Kirim Email untuk invoice yang baru dibuat
			successCount := 0
			for _, invID := range createdIDs {
				if err := a.processSendInvoiceEmail(ctx, invID); err != nil {
					log.Printf("Worker: Failed to send auto-email for invoice %d: %v", invID, err)
				} else {
					successCount++
				}
				// Beri jeda sedikit agar tidak dianggap spam oleh SMTP provider
				time.Sleep(2 * time.Second)
			}

			log.Printf("Worker: Successfully sent %d auto-emails for %s", successCount, wsName)

			// C. Update status last_billing_run_month agar tidak jalan lagi hari ini/bulan ini
			_, err = a.db.Exec(ctx, "UPDATE workspaces SET last_billing_run_month = $1 WHERE id = $2", currentMonth, wsID)
			if err != nil {
				log.Printf("Worker: Failed to update last_billing_run_month for %s: %v", wsName, err)
			}
		}
	}
}
