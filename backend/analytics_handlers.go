package main

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

func (a *appState) handleGetTopTalkers(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")
	wsID, _ := strconv.Atoi(wsIDStr)
	if wsID <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	deviceIP := c.QueryParam("deviceIp")
	limitStr := c.QueryParam("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 10
	}

	since := time.Now().Add(-1 * time.Hour)

	query := `
		SELECT src_ip, SUM(bytes) as total_bytes
		FROM flow_logs
		WHERE workspace_id = $1 AND captured_at >= $2
	`
	args := []interface{}{wsID, since}
	if deviceIP != "" {
		query += " AND agent_ip = $3"
		args = append(args, deviceIP)
	}
	query += " GROUP BY src_ip ORDER BY total_bytes DESC LIMIT $" + strconv.Itoa(len(args)+1)
	if deviceIP == "" {
		query = `
		SELECT src_ip, SUM(bytes) as total_bytes
		FROM flow_logs
		WHERE workspace_id = $1 AND captured_at >= $2
		GROUP BY src_ip
		ORDER BY total_bytes DESC
		LIMIT $3
		`
		args = append(args, limit)
	} else {
		args = append(args, limit)
	}

	rows, err := a.db.Query(ctx, query, args...)
	if err != nil {
		log.Printf("Analytics: Top Talkers query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query analytics")
	}
	defer rows.Close()

	type Talker struct {
		IP    string `json:"ip"`
		Bytes int64  `json:"bytes"`
	}

	var results []Talker
	for rows.Next() {
		var t Talker
		if err := rows.Scan(&t.IP, &t.Bytes); err != nil {
			continue
		}
		results = append(results, t)
	}

	return c.JSON(http.StatusOK, results)
}

func (a *appState) handleGetProtocolBreakdown(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")
	wsID, _ := strconv.Atoi(wsIDStr)
	if wsID <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	deviceIP := c.QueryParam("deviceIp")
	since := time.Now().Add(-24 * time.Hour)

	query := `
		SELECT protocol, SUM(bytes) as total_bytes
		FROM flow_logs
		WHERE workspace_id = $1 AND captured_at >= $2
	`
	args := []interface{}{wsID, since}
	if deviceIP != "" {
		query += " AND agent_ip = $3"
		args = append(args, deviceIP)
	}
	query += " GROUP BY protocol ORDER BY total_bytes DESC"

	rows, err := a.db.Query(ctx, query, args...)
	if err != nil {
		log.Printf("Analytics: Protocol query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query analytics")
	}
	defer rows.Close()

	type ProtoData struct {
		Protocol int    `json:"protocol"`
		Name     string `json:"name"`
		Bytes    int64  `json:"bytes"`
	}

	var results []ProtoData
	for rows.Next() {
		var p ProtoData
		if err := rows.Scan(&p.Protocol, &p.Bytes); err != nil {
			continue
		}
		
		switch p.Protocol {
		case 6: p.Name = "TCP"
		case 17: p.Name = "UDP"
		case 1: p.Name = "ICMP"
		default: p.Name = "Other"
		}
		
		results = append(results, p)
	}

	return c.JSON(http.StatusOK, results)
}

func (a *appState) handleGetFlowLogs(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")
	wsID, _ := strconv.Atoi(wsIDStr)
	
	deviceIP := c.QueryParam("deviceIp")
	limit := 50
	
	query := `
		SELECT src_ip, dst_ip, protocol, src_port, dst_port, bytes, captured_at
		FROM flow_logs
		WHERE workspace_id = $1
	`
	args := []interface{}{wsID}
	if deviceIP != "" {
		query += " AND agent_ip = $2"
		args = append(args, deviceIP)
	}
	query += " ORDER BY captured_at DESC LIMIT $" + strconv.Itoa(len(args)+1)
	args = append(args, limit)

	rows, err := a.db.Query(ctx, query, args...)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to query logs")
	}
	defer rows.Close()

	type FlowLog struct {
		SrcIP      string    `json:"srcIp"`
		DstIP      string    `json:"dstIp"`
		Protocol   string    `json:"protocol"`
		SrcPort    int       `json:"srcPort"`
		DstPort    int       `json:"dstPort"`
		Bytes      int64     `json:"bytes"`
		CapturedAt time.Time `json:"capturedAt"`
	}

	var results []FlowLog
	for rows.Next() {
		var l FlowLog
		var protoNum int
		if err := rows.Scan(&l.SrcIP, &l.DstIP, &protoNum, &l.SrcPort, &l.DstPort, &l.Bytes, &l.CapturedAt); err != nil {
			continue
		}
		
		switch protoNum {
		case 6: l.Protocol = "TCP"
		case 17: l.Protocol = "UDP"
		default: l.Protocol = "OTHER"
		}
		
		results = append(results, l)
	}

	return c.JSON(http.StatusOK, results)
}

func (a *appState) handleGetActiveAnalyticsDevices(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")
	wsID, _ := strconv.Atoi(wsIDStr)

	// Get unique agent IPs from the last 24 hours
	query := `
		SELECT DISTINCT agent_ip 
		FROM flow_logs 
		WHERE workspace_id = $1 AND captured_at >= $2 AND agent_ip IS NOT NULL
	`
	rows, err := a.db.Query(ctx, query, wsID, time.Now().Add(-24*time.Hour))
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to query active devices")
	}
	defer rows.Close()

	var results []string
	for rows.Next() {
		var ip string
		if err := rows.Scan(&ip); err != nil {
			continue
		}
		results = append(results, ip)
	}

	return c.JSON(http.StatusOK, results)
}
