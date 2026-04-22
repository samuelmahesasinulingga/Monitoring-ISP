package main

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

type SLAStatsResponse struct {
	UptimePercentage float64         `json:"uptimePercentage"`
	TotalLogs        int             `json:"totalLogs"`
	UpLogs           int             `json:"upLogs"`
	DownLogs         int             `json:"downLogs"`
	AvgLatencyMs     float64         `json:"avgLatencyMs"`
	DowntimeMinutes  int             `json:"downtimeMinutes"`
	DowntimeEvents   []DowntimeEvent `json:"downtimeEvents"`
}

type DowntimeEvent struct {
	Date        string `json:"date"`
	DurationMin int    `json:"durationMin"`
	Cause       string `json:"cause"`
}

func (a *appState) handleGetSLAStats(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")
	devIDStr := c.QueryParam("deviceId")
	period := c.QueryParam("period") // daily, weekly, monthly

	wsID, _ := strconv.Atoi(wsIDStr)
	if wsID <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspaceId")
	}

	// Calculate start time
	var startTime time.Time
	now := time.Now()
	switch period {
	case "daily":
		startTime = now.Add(-24 * time.Hour)
	case "weekly":
		startTime = now.Add(-7 * 24 * time.Hour)
	case "monthly":
		startTime = now.Add(-30 * 24 * time.Hour)
	default:
		startTime = now.Add(-30 * 24 * time.Hour) // Default monthly
	}

	// Base query construction
	whereClause := "WHERE d.workspace_id = $1 AND l.created_at >= $2"
	args := []interface{}{wsID, startTime}

	if devIDStr != "" {
		devID, _ := strconv.Atoi(devIDStr)
		if devID > 0 {
			whereClause += " AND l.device_id = $3"
			args = append(args, devID)
		}
	}

	queryFromJoin := " FROM device_ping_logs l JOIN devices d ON l.device_id = d.id "

	// 1. Get Counts & Latency
	countQuery := "SELECT status, COUNT(*), COALESCE(AVG(latency_ms), 0) " + queryFromJoin + whereClause + " GROUP BY status"
	if a.db == nil {
		return c.String(http.StatusInternalServerError, "database pool is nil")
	}
	
	rows, err := a.db.Query(ctx, countQuery, args...)
	if err != nil {
		log.Printf("SLA stats count query error: %v (Query: %s)", err, countQuery)
		return c.String(http.StatusInternalServerError, "failed to query SLA stats")
	}
	defer rows.Close()

	var upCount, downCount int
	var avgLat float64
	
	for rows.Next() {
		var status string
		var count int
		var lat float64
		if err := rows.Scan(&status, &count, &lat); err == nil {
			if status == "UP" {
				upCount = count
				avgLat = lat
			} else {
				downCount = count
			}
		}
	}

	totalLogs := upCount + downCount
	uptimePercentage := 100.0
	if totalLogs > 0 {
		uptimePercentage = (float64(upCount) / float64(totalLogs)) * 100
	}

	// 2. Get Downtime Events (recent 10 down logs)
	eventQuery := "SELECT l.created_at, l.status " + queryFromJoin + whereClause + " AND l.status = 'DOWN' ORDER BY l.created_at DESC LIMIT 10"
	eventRows, err := a.db.Query(ctx, eventQuery, args...)
	
	downtimeEvents := []DowntimeEvent{}
	if err == nil && eventRows != nil {
		defer eventRows.Close()
		for eventRows.Next() {
			var t time.Time
			var s string
			if err := eventRows.Scan(&t, &s); err == nil {
				downtimeEvents = append(downtimeEvents, DowntimeEvent{
					Date:        t.Format("2006-01-02 15:04:05"),
					DurationMin: 0,
					Cause:       "No Response (Timeout)",
				})
			}
		}
	} else if err != nil {
		log.Printf("SLA events query error: %v", err)
	}

	// Estimation of total downtime minutes
	periodDuration := now.Sub(startTime).Minutes()
	estDowntimeMin := 0
	if totalLogs > 0 {
		estDowntimeMin = int((float64(downCount) / float64(totalLogs)) * periodDuration)
	}

	return c.JSON(http.StatusOK, SLAStatsResponse{
		UptimePercentage: uptimePercentage,
		TotalLogs:        totalLogs,
		UpLogs:           upCount,
		DownLogs:         downCount,
		AvgLatencyMs:     avgLat,
		DowntimeMinutes:  estDowntimeMin,
		DowntimeEvents:   downtimeEvents,
	})
}
