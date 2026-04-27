package main

import (
	"encoding/csv"
	"fmt"
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
	svcIDStr := c.QueryParam("serviceId")
	custIDStr := c.QueryParam("customerId")
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

	if svcIDStr != "" {
		svcID, _ := strconv.Atoi(svcIDStr)
		if svcID > 0 {
			queryFromJoin = " FROM service_ping_logs l JOIN services s ON l.service_id = s.id "
			whereClause = " WHERE s.workspace_id = $1 AND l.created_at >= $2 AND l.service_id = $3 "
			args = []interface{}{wsID, startTime, svcID}
		}
	}

	if custIDStr != "" {
		custID, _ := strconv.Atoi(custIDStr)
		if custID > 0 {
			queryFromJoin = " FROM service_ping_logs l JOIN services s ON l.service_id = s.id "
			whereClause = " WHERE s.workspace_id = $1 AND l.created_at >= $2 AND s.customer_id = $3 "
			args = []interface{}{wsID, startTime, custID}
		}
	}

	// 1. Get Counts & Latency & First Log Time
	countQuery := "SELECT status, COUNT(*), COALESCE(AVG(latency_ms), 0), MIN(l.created_at) " + queryFromJoin + whereClause + " GROUP BY status"
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
	var firstLogTime time.Time
	
	for rows.Next() {
		var status string
		var count int
		var lat float64
		var minTime time.Time
		if err := rows.Scan(&status, &count, &lat, &minTime); err == nil {
			if status == "UP" {
				upCount = count
				avgLat = lat
			} else {
				downCount = count
			}
			if firstLogTime.IsZero() || minTime.Before(firstLogTime) {
				firstLogTime = minTime
			}
		} else {
			log.Printf("SLA stats row scan error: %v", err)
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
	actualDuration := now.Sub(startTime).Minutes()
	if !firstLogTime.IsZero() && firstLogTime.After(startTime) {
		actualDuration = now.Sub(firstLogTime).Minutes()
	}

	estDowntimeMin := 0
	if totalLogs > 0 {
		estDowntimeMin = int((float64(downCount) / float64(totalLogs)) * actualDuration)
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

type PingHistoryResponse struct {
	Timestamp time.Time `json:"timestamp"`
	Min       float64   `json:"min"`
	Max       float64   `json:"max"`
	Avg       float64   `json:"avg"`
	Uptime    float64   `json:"uptime"`
}

func (a *appState) handleGetPingHistory(c echo.Context) error {
	ctx := c.Request().Context()
	deviceID, _ := strconv.Atoi(c.Param("id"))
	period := c.QueryParam("period") // daily, weekly, monthly, yearly
	dateStr := c.QueryParam("date")   // YYYY-MM

	var startTime time.Time
	now := time.Now()

	switch period {
	case "daily":
		startTime = now.Add(-24 * time.Hour)
	case "weekly":
		startTime = now.Add(-7 * 24 * time.Hour)
	case "monthly":
		if dateStr != "" {
			t, err := time.Parse("2006-01", dateStr)
			if err == nil {
				startTime = t
				now = t.AddDate(0, 1, 0) // End of month
			} else {
				startTime = now.AddDate(0, -1, 0)
			}
		} else {
			startTime = now.AddDate(0, -1, 0)
		}
	case "yearly":
		startTime = now.AddDate(-1, 0, 0)
	default:
		startTime = now.Add(-24 * time.Hour)
	}

	var query string
	if period == "daily" {
		// For daily, we can use raw logs if they exist, or hourly aggregates.
		// Let's use raw logs for better resolution if available, fallback to aggregates.
		query = `
			SELECT created_at as timestamp, latency_ms as min, latency_ms as max, latency_ms as avg, 
			       CASE WHEN status = 'UP' THEN 100.0 ELSE 0.0 END as uptime
			FROM device_ping_logs
			WHERE device_id = $1 AND created_at >= $2 AND created_at <= $3
			ORDER BY created_at ASC
		`
	} else if period == "yearly" {
		// For yearly, aggregate by day
		query = `
			SELECT date_trunc('day', timestamp) as ts, 
			       MIN(min_latency_ms), MAX(max_latency_ms), AVG(avg_latency_ms),
			       (SUM(up_count)::float / SUM(total_count)::float) * 100.0 as uptime
			FROM device_ping_hourly_stats
			WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3
			GROUP BY ts
			ORDER BY ts ASC
		`
	} else {
		// Weekly and Monthly use hourly aggregates
		query = `
			SELECT timestamp, min_latency_ms, max_latency_ms, avg_latency_ms, 
			       (up_count::float / total_count::float) * 100.0 as uptime
			FROM device_ping_hourly_stats
			WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3
			ORDER BY timestamp ASC
		`
	}

	rows, err := a.db.Query(ctx, query, deviceID, startTime, now)
	if err != nil {
		log.Printf("Error querying ping history: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query history")
	}
	defer rows.Close()

	var results []PingHistoryResponse
	for rows.Next() {
		var r PingHistoryResponse
		if err := rows.Scan(&r.Timestamp, &r.Min, &r.Max, &r.Avg, &r.Uptime); err != nil {
			continue
		}
		results = append(results, r)
	}

	if results == nil {
		results = []PingHistoryResponse{}
	}

	return c.JSON(http.StatusOK, results)
}

func (a *appState) handleExportPingHistoryCSV(c echo.Context) error {
	ctx := c.Request().Context()
	deviceID, _ := strconv.Atoi(c.Param("id"))
	period := c.QueryParam("period")
	dateStr := c.QueryParam("date")

	var startTime time.Time
	now := time.Now()

	switch period {
	case "daily":
		startTime = now.Add(-24 * time.Hour)
	case "weekly":
		startTime = now.Add(-7 * 24 * time.Hour)
	case "monthly":
		if dateStr != "" {
			t, err := time.Parse("2006-01", dateStr)
			if err == nil {
				startTime = t
				now = t.AddDate(0, 1, 0)
			} else {
				startTime = now.AddDate(0, -1, 0)
			}
		} else {
			startTime = now.AddDate(0, -1, 0)
		}
	case "yearly":
		startTime = now.AddDate(-1, 0, 0)
	default:
		startTime = now.Add(-24 * time.Hour)
	}

	var query string
	if period == "daily" {
		query = `
			SELECT created_at as timestamp, latency_ms as min, latency_ms as max, latency_ms as avg, 
			       CASE WHEN status = 'UP' THEN 100.0 ELSE 0.0 END as uptime
			FROM device_ping_logs
			WHERE device_id = $1 AND created_at >= $2 AND created_at <= $3
			ORDER BY created_at ASC
		`
	} else if period == "yearly" {
		query = `
			SELECT date_trunc('day', timestamp) as ts, 
			       MIN(min_latency_ms), MAX(max_latency_ms), AVG(avg_latency_ms),
			       (SUM(up_count)::float / SUM(total_count)::float) * 100.0 as uptime
			FROM device_ping_hourly_stats
			WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3
			GROUP BY ts
			ORDER BY ts ASC
		`
	} else {
		query = `
			SELECT timestamp, min_latency_ms, max_latency_ms, avg_latency_ms, 
			       (up_count::float / total_count::float) * 100.0 as uptime
			FROM device_ping_hourly_stats
			WHERE device_id = $1 AND timestamp >= $2 AND timestamp <= $3
			ORDER BY timestamp ASC
		`
	}

	rows, err := a.db.Query(ctx, query, deviceID, startTime, now)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to query history")
	}
	defer rows.Close()

	c.Response().Header().Set("Content-Type", "text/csv")
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=ping_history_%d_%s.csv", deviceID, period))

	writer := csv.NewWriter(c.Response().Writer)
	defer writer.Flush()

	// Write header
	writer.Write([]string{"Timestamp", "Min Latency (ms)", "Max Latency (ms)", "Avg Latency (ms)", "Uptime (%)"})

	for rows.Next() {
		var ts time.Time
		var min, max, avg float64
		var uptime float64
		if err := rows.Scan(&ts, &min, &max, &avg, &uptime); err != nil {
			continue
		}
		writer.Write([]string{
			ts.Format("2006-01-02 15:04:05"),
			fmt.Sprintf("%.1f", min),
			fmt.Sprintf("%.1f", max),
			fmt.Sprintf("%.1f", avg),
			fmt.Sprintf("%.2f", uptime),
		})
	}

	return nil
}

type YearlyUptimeReport struct {
	TotalHours     float64 `json:"totalHours"`
	UptimeHours    float64 `json:"uptimeHours"`
	DowntimeHours  float64 `json:"downtimeHours"`
	UptimePercentage float64 `json:"uptimePercentage"`
	MonthlyUptime  []MonthlyUptime `json:"monthlyUptime"`
}

type MonthlyUptime struct {
	Month      string  `json:"month"`
	UptimePct  float64 `json:"uptimePct"`
	UpHours    float64 `json:"upHours"`
}

func (a *appState) handleGetYearlyUptimeReport(c echo.Context) error {
	ctx := c.Request().Context()
	deviceID, _ := strconv.Atoi(c.Param("id"))

	query := `
		SELECT 
			EXTRACT(YEAR FROM timestamp) as yr,
			EXTRACT(MONTH FROM timestamp) as mon,
			SUM(up_count)::float / SUM(total_count)::float as avg_uptime_pct,
			COUNT(*) as recorded_hours,
			SUM(up_count::float / total_count::float) as actual_up_hours
		FROM device_ping_hourly_stats
		WHERE device_id = $1 AND timestamp >= NOW() - INTERVAL '1 year'
		GROUP BY yr, mon
		ORDER BY yr ASC, mon ASC
	`
	
	rows, err := a.db.Query(ctx, query, deviceID)
	if err != nil {
		log.Printf("Uptime report query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query uptime report")
	}
	defer rows.Close()

	var report YearlyUptimeReport
	months := []string{"", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	
	for rows.Next() {
		var yr, mon int
		var avgPct, recHours, upHours float64
		if err := rows.Scan(&yr, &mon, &avgPct, &recHours, &upHours); err == nil {
			report.TotalHours += recHours
			report.UptimeHours += upHours
			report.MonthlyUptime = append(report.MonthlyUptime, MonthlyUptime{
				Month:     fmt.Sprintf("%s %d", months[mon], yr),
				UptimePct: avgPct * 100.0,
				UpHours:   upHours,
			})
		}
	}

	report.DowntimeHours = report.TotalHours - report.UptimeHours
	if report.TotalHours > 0 {
		report.UptimePercentage = (report.UptimeHours / report.TotalHours) * 100.0
	} else {
		report.UptimePercentage = 100.0
	}

	return c.JSON(http.StatusOK, report)
}
