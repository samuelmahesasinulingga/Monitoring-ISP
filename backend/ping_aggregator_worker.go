package main

import (
	"context"
	"log"
	"time"
)

func startPingAggregatorWorker(state *appState) {
	// Wait until the next full hour to start the first aggregation
	now := time.Now()
	nextHour := now.Truncate(time.Hour).Add(time.Hour)
	time.Sleep(nextHour.Sub(now))

	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()

	// Initial run
	runAggregation(state)

	for range ticker.C {
		runAggregation(state)
	}
}

func runAggregation(state *appState) {
	ctx := context.Background()
	// We aggregate for the PREVIOUS hour
	endTime := time.Now().Truncate(time.Hour)
	startTime := endTime.Add(-time.Hour)

	log.Printf("Starting ping aggregation for period %s to %s", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339))

	// Get all devices
	rows, err := state.db.Query(ctx, "SELECT id FROM devices")
	if err != nil {
		log.Printf("Aggregator error fetching devices: %v", err)
		return
	}
	defer rows.Close()

	var deviceIDs []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err == nil {
			deviceIDs = append(deviceIDs, id)
		}
	}

	for _, deviceID := range deviceIDs {
		// Aggregate min, max, avg, and up/total counts
		query := `
			SELECT 
				MIN(latency_ms), 
				MAX(latency_ms), 
				AVG(latency_ms), 
				COUNT(*) FILTER (WHERE status = 'UP'), 
				COUNT(*)
			FROM device_ping_logs
			WHERE device_id = $1 AND created_at >= $2 AND created_at < $3
		`
		var minLat, maxLat, totalCount, upCount int
		var avgLat float64
		err := state.db.QueryRow(ctx, query, deviceID, startTime, endTime).Scan(&minLat, &maxLat, &avgLat, &upCount, &totalCount)
		
		if err != nil {
			// Possibly no logs for this period
			continue
		}

		if totalCount > 0 {
			_, err = state.db.Exec(ctx, `
				INSERT INTO device_ping_hourly_stats 
				(device_id, timestamp, min_latency_ms, max_latency_ms, avg_latency_ms, up_count, total_count)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				ON CONFLICT (device_id, timestamp) DO UPDATE SET
				min_latency_ms = EXCLUDED.min_latency_ms,
				max_latency_ms = EXCLUDED.max_latency_ms,
				avg_latency_ms = EXCLUDED.avg_latency_ms,
				up_count = EXCLUDED.up_count,
				total_count = EXCLUDED.total_count
			`, deviceID, startTime, minLat, maxLat, int(avgLat), upCount, totalCount)

			if err != nil {
				log.Printf("Failed to insert aggregate for device %d: %v", deviceID, err)
			}
		}
	}

	// Prune old logs (older than 48 hours)
	pruneTime := time.Now().Add(-48 * time.Hour)
	res, err := state.db.Exec(ctx, "DELETE FROM device_ping_logs WHERE created_at < $1", pruneTime)
	if err == nil {
		rowsAffected := res.RowsAffected()
		if rowsAffected > 0 {
			log.Printf("Pruned %d old ping logs", rowsAffected)
		}
	} else {
		log.Printf("Error pruning old ping logs: %v", err)
	}
}
