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
	deviceIDStr := c.QueryParam("deviceId")
	deviceID, _ := strconv.Atoi(deviceIDStr)
	customerIP := c.QueryParam("customerIp")
	customerIDStr := c.QueryParam("customerId")
	customerID, _ := strconv.Atoi(customerIDStr)

	durationStr := c.QueryParam("duration")
	duration, _ := strconv.Atoi(durationStr)

	limitStr := c.QueryParam("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 10
	}

	since := time.Now().Add(-1 * time.Hour)
	if duration > 0 {
		since = time.Now().Add(-time.Duration(duration) * time.Minute)
	}

	query := `
		SELECT src_ip::text, SUM(bytes) as total_bytes
		FROM flow_logs
		WHERE workspace_id = $1 AND captured_at >= $2
	`
	args := []interface{}{wsID, since}
	
	if deviceID > 0 {
		query += " AND (device_id = $3 OR agent_ip::text = (SELECT ip FROM devices WHERE id = $3))"
		args = append(args, deviceID)
	} else if deviceIP != "" {
		query += " AND agent_ip = $3"
		args = append(args, deviceIP)
	} else if customerIP != "" {
		query += " AND (src_ip = $3 OR dst_ip = $3)"
		args = append(args, customerIP)
	} else if customerID > 0 {
		query += " AND (src_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3) OR dst_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3))"
		args = append(args, customerID)
	}

	query += " GROUP BY src_ip ORDER BY total_bytes DESC LIMIT $" + strconv.Itoa(len(args)+1)
	args = append(args, limit)

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
	deviceIDStr := c.QueryParam("deviceId")
	deviceID, _ := strconv.Atoi(deviceIDStr)
	customerIP := c.QueryParam("customerIp")
	customerIDStr := c.QueryParam("customerId")
	customerID, _ := strconv.Atoi(customerIDStr)

	durationStr := c.QueryParam("duration")
	duration, _ := strconv.Atoi(durationStr)

	since := time.Now().Add(-24 * time.Hour)
	if duration > 0 {
		since = time.Now().Add(-time.Duration(duration) * time.Minute)
	}

	query := `
		SELECT protocol, SUM(bytes) as total_bytes
		FROM flow_logs
		WHERE workspace_id = $1 AND captured_at >= $2
	`
	args := []interface{}{wsID, since}
	if deviceID > 0 {
		query += " AND (device_id = $3 OR agent_ip::text = (SELECT ip FROM devices WHERE id = $3))"
		args = append(args, deviceID)
	} else if deviceIP != "" {
		query += " AND agent_ip = $3"
		args = append(args, deviceIP)
	} else if customerIP != "" {
		query += " AND (src_ip = $3 OR dst_ip = $3)"
		args = append(args, customerIP)
	} else if customerID > 0 {
		query += " AND (src_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3) OR dst_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3))"
		args = append(args, customerID)
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
	deviceIDStr := c.QueryParam("deviceId")
	deviceID, _ := strconv.Atoi(deviceIDStr)
	customerIP := c.QueryParam("customerIp")
	customerIDStr := c.QueryParam("customerId")
	customerID, _ := strconv.Atoi(customerIDStr)

	pageStr := c.QueryParam("page")
	page, _ := strconv.Atoi(pageStr)
	if page <= 0 {
		page = 1
	}
	limitStr := c.QueryParam("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 30
	}
	offset := (page - 1) * limit
	
	durationStr := c.QueryParam("duration")
	duration, _ := strconv.Atoi(durationStr)

	since := time.Now().Add(-24 * time.Hour) // Default to 24h
	if duration > 0 {
		since = time.Now().Add(-time.Duration(duration) * time.Minute)
	}

	countQuery := "SELECT COUNT(*) FROM flow_logs WHERE workspace_id = $1 AND captured_at >= $2"
	args := []interface{}{wsID, since}
	if deviceID > 0 {
		countQuery += " AND (device_id = $3 OR agent_ip::text = (SELECT ip FROM devices WHERE id = $3))"
		args = append(args, deviceID)
	} else if deviceIP != "" {
		countQuery += " AND agent_ip = $3"
		args = append(args, deviceIP)
	} else if customerIP != "" {
		countQuery += " AND (src_ip = $" + strconv.Itoa(len(args)+1) + " OR dst_ip = $" + strconv.Itoa(len(args)+1) + ")"
		args = append(args, customerIP)
	} else if customerID > 0 {
		countQuery += " AND (src_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3) OR dst_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3))"
		args = append(args, customerID)
	}

	var totalCount int
	a.db.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	
	query := `
		SELECT src_ip::text, dst_ip::text, protocol, src_port, dst_port, bytes, captured_at
		FROM flow_logs
		WHERE workspace_id = $1 AND captured_at >= $2
	`
	if deviceID > 0 {
		query += " AND (device_id = $3 OR agent_ip::text = (SELECT ip FROM devices WHERE id = $3))"
	} else if deviceIP != "" {
		query += " AND agent_ip = $3"
	} else if customerIP != "" {
		query += " AND (src_ip = $" + strconv.Itoa(len(args)+1) + " OR dst_ip = $" + strconv.Itoa(len(args)+1) + ")"
	} else if customerID > 0 {
		query += " AND (src_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3) OR dst_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3))"
	}

	query += " ORDER BY captured_at DESC LIMIT $" + strconv.Itoa(len(args)+1) + " OFFSET $" + strconv.Itoa(len(args)+2)
	args = append(args, limit, offset)

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

	if results == nil {
		results = []FlowLog{}
	}

	totalPages := totalCount / limit
	if totalCount%limit != 0 {
		totalPages++
	}

	type FlowLogResponse struct {
		Logs        []FlowLog `json:"logs"`
		TotalPages  int       `json:"totalPages"`
		CurrentPage int       `json:"currentPage"`
		TotalCount  int       `json:"totalCount"`
	}

	return c.JSON(http.StatusOK, FlowLogResponse{
		Logs:        results,
		TotalPages:  totalPages,
		CurrentPage: page,
		TotalCount:  totalCount,
	})
}

func (a *appState) handleGetApplicationBreakdown(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")
	wsID, _ := strconv.Atoi(wsIDStr)
	if wsID <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspace id")
	}

	deviceIDStr := c.QueryParam("deviceId")
	deviceID, _ := strconv.Atoi(deviceIDStr)
	customerIDStr := c.QueryParam("customerId")
	customerID, _ := strconv.Atoi(customerIDStr)

	durationStr := c.QueryParam("duration")
	duration, _ := strconv.Atoi(durationStr)

	since := time.Now().Add(-24 * time.Hour)
	if duration > 0 {
		since = time.Now().Add(-time.Duration(duration) * time.Minute)
	}

	query := `
		SELECT dst_port, SUM(bytes) as total_bytes
		FROM flow_logs
		WHERE workspace_id = $1 AND captured_at >= $2
	`
	args := []interface{}{wsID, since}
	
	if deviceID > 0 {
		query += " AND (device_id = $3 OR agent_ip::text = (SELECT ip FROM devices WHERE id = $3))"
		args = append(args, deviceID)
	} else if customerID > 0 {
		query += " AND (src_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3) OR dst_ip IN (SELECT monitoring_ip FROM services WHERE customer_id = $3))"
		args = append(args, customerID)
	}

	query += " GROUP BY dst_port ORDER BY total_bytes DESC LIMIT 10"

	rows, err := a.db.Query(ctx, query, args...)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to query apps")
	}
	defer rows.Close()

	type AppData struct {
		Port  int    `json:"port"`
		Name  string `json:"name"`
		Bytes int64  `json:"bytes"`
	}

	var results []AppData
	for rows.Next() {
		var d AppData
		if err := rows.Scan(&d.Port, &d.Bytes); err != nil {
			continue
		}

		// Map common ports to names
		switch d.Port {
		case 80, 443: d.Name = "Web (HTTP/S)"
		case 53: d.Name = "DNS"
		case 22: d.Name = "SSH"
		case 21: d.Name = "FTP"
		case 8291: d.Name = "Winbox"
		case 161, 162: d.Name = "SNMP"
		case 123: d.Name = "NTP"
		case 3389: d.Name = "RDP"
		case 25, 465, 587, 993, 995: d.Name = "Email"
		case 1701, 1723, 500, 4500: d.Name = "VPN"
		case 1812, 1813: d.Name = "Radius"
		case 5678: d.Name = "MikroTik MNDP"
		case 67, 68: d.Name = "DHCP"
		case 137, 138, 139: d.Name = "NetBIOS"
		case 20561: d.Name = "BW Test"
		case 1900: d.Name = "SSDP"
		case 5353: d.Name = "mDNS"
		default: d.Name = strconv.Itoa(d.Port)
		}
		
		results = append(results, d)
	}

	if results == nil {
		results = []AppData{}
	}

	return c.JSON(http.StatusOK, results)
}

func (a *appState) handleGetActiveAnalyticsDevices(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")
	wsID, _ := strconv.Atoi(wsIDStr)

	// Get unique device IDs that have data (either by device_id column or by mapping agent_ip)
	query := `
		SELECT DISTINCT d.id
		FROM devices d
		LEFT JOIN flow_logs f ON (f.device_id = d.id OR f.agent_ip::text = d.ip)
		WHERE d.workspace_id = $1 AND f.captured_at >= $2
	`
	rows, err := a.db.Query(ctx, query, wsID, time.Now().Add(-24*time.Hour))
	if err != nil {
		log.Printf("Active analytics devices query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query active devices")
	}
	defer rows.Close()

	var results []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err == nil {
			results = append(results, id)
		}
	}

	if results == nil {
		results = []int{}
	}

	return c.JSON(http.StatusOK, results)
}
