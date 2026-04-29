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
		SELECT 
			COALESCE(service_name, 'PORT:' || service_port::text) as final_name,
			service_port,
			SUM(bytes) as total_bytes
		FROM (
			SELECT 
				CASE 
					-- Google / YouTube / GGC (Google Global Cache)
					WHEN dst_ip <<= '172.217.0.0/16' OR src_ip <<= '172.217.0.0/16' OR
						 dst_ip <<= '142.250.0.0/15' OR src_ip <<= '142.250.0.0/15' OR
						 dst_ip <<= '74.125.0.0/16' OR src_ip <<= '74.125.0.0/16' OR
						 dst_ip <<= '209.85.128.0/17' OR src_ip <<= '209.85.128.0/17' OR
						 dst_ip <<= '216.58.192.0/19' OR src_ip <<= '216.58.192.0/19' OR
						 dst_ip <<= '64.233.160.0/19' OR src_ip <<= '64.233.160.0/19' OR
						 dst_ip <<= '66.102.0.0/20' OR src_ip <<= '66.102.0.0/20' OR
						 dst_ip <<= '66.249.64.0/19' OR src_ip <<= '66.249.64.0/19' OR
						 dst_ip <<= '72.14.192.0/18' OR src_ip <<= '72.14.192.0/18' OR
						 dst_ip <<= '108.177.0.0/17' OR src_ip <<= '108.177.0.0/17' OR
						 dst_ip <<= '2001:4860::/32' OR src_ip <<= '2001:4860::/32' THEN 'YouTube / Google'
						 
					-- Meta (Facebook / Instagram / WhatsApp)
					WHEN dst_ip <<= '157.240.0.0/16' OR src_ip <<= '157.240.0.0/16' OR
						 dst_ip <<= '31.13.24.0/21' OR src_ip <<= '31.13.24.0/21' OR
						 dst_ip <<= '31.13.64.0/18' OR src_ip <<= '31.13.64.0/18' OR
						 dst_ip <<= '173.252.64.0/18' OR src_ip <<= '173.252.64.0/18' OR
						 dst_ip <<= '129.134.0.0/16' OR src_ip <<= '129.134.0.0/16' OR
						 dst_ip <<= '185.60.216.0/22' OR src_ip <<= '185.60.216.0/22' OR
						 dst_ip <<= '204.15.20.0/22' OR src_ip <<= '204.15.20.0/22' OR
						 dst_ip <<= '2a03:2880::/32' OR src_ip <<= '2a03:2880::/32' THEN 'Facebook / Instagram'
						 
					-- Netflix
					WHEN dst_ip <<= '45.57.0.0/17' OR src_ip <<= '45.57.0.0/17' OR
						 dst_ip <<= '198.38.96.0/19' OR src_ip <<= '198.38.96.0/19' OR
						 dst_ip <<= '198.45.48.0/20' OR src_ip <<= '198.45.48.0/20' OR
						 dst_ip <<= '23.246.0.0/18' OR src_ip <<= '23.246.0.0/18' OR
						 dst_ip <<= '2a00:86c0::/32' OR src_ip <<= '2a00:86c0::/32' THEN 'Netflix'
						 
					-- TikTok / ByteDance
					WHEN dst_ip <<= '161.117.0.0/16' OR src_ip <<= '161.117.0.0/16' OR
						 dst_ip <<= '156.59.0.0/16' OR src_ip <<= '156.59.0.0/16' OR
						 dst_ip <<= '130.44.212.0/22' OR src_ip <<= '130.44.212.0/22' OR
						 dst_ip <<= '47.252.0.0/15' OR src_ip <<= '47.252.0.0/15' OR
						 dst_ip <<= '116.211.0.0/16' OR src_ip <<= '116.211.0.0/16' OR
						 dst_ip <<= '117.185.0.0/16' OR src_ip <<= '117.185.0.0/16' OR
						 dst_ip <<= '139.159.0.0/16' OR src_ip <<= '139.159.0.0/16' OR
						 dst_ip <<= '203.205.128.0/18' OR src_ip <<= '203.205.128.0/18' OR
						 dst_ip <<= '2a0e:b100::/32' OR src_ip <<= '2a0e:b100::/32' OR
						 dst_ip <<= '2606:fe00::/32' OR src_ip <<= '2606:fe00::/32' THEN 'TikTok'
						 
					-- Microsoft
					WHEN dst_ip <<= '13.64.0.0/11' OR src_ip <<= '13.64.0.0/11' OR
						 dst_ip <<= '40.64.0.0/10' OR src_ip <<= '40.64.0.0/10' OR
						 dst_ip <<= '52.145.0.0/16' OR src_ip <<= '52.145.0.0/16' THEN 'Microsoft Services'
						 
					-- CDNs
					WHEN dst_ip <<= '104.16.0.0/12' OR src_ip <<= '104.16.0.0/12' OR
						 dst_ip <<= '172.64.0.0/13' OR src_ip <<= '172.64.0.0/13' THEN 'Cloudflare (CDN)'
					WHEN dst_ip <<= '23.0.0.0/8' OR src_ip <<= '23.0.0.0/8' THEN 'Akamai (CDN)'
					
					ELSE NULL
				END as service_name,
				CASE 
					WHEN dst_port < 1024 THEN dst_port
					WHEN src_port < 1024 THEN src_port
					WHEN dst_port < 32768 THEN dst_port
					WHEN src_port < 32768 THEN src_port
					ELSE dst_port
				END as service_port,
				bytes
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

	query += `
		) sub
		GROUP BY final_name, service_port 
		ORDER BY total_bytes DESC 
		LIMIT 10
	`

	rows, err := a.db.Query(ctx, query, args...)
	if err != nil {
		log.Printf("Analytics: App Breakdown query error: %v", err)
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
		var finalName string
		if err := rows.Scan(&finalName, &d.Port, &d.Bytes); err != nil {
			continue
		}

		// If SQL didn't provide a friendly name, use port mapping
		if finalName == "PORT:"+strconv.Itoa(d.Port) {
			switch d.Port {
		case 80, 443:
			d.Name = "Web (HTTP/S)"
		case 53:
			d.Name = "DNS"
		case 22:
			d.Name = "SSH"
		case 21:
			d.Name = "FTP"
		case 8291:
			d.Name = "Winbox (MikroTik)"
		case 161, 162:
			d.Name = "SNMP"
		case 123:
			d.Name = "NTP"
		case 3389:
			d.Name = "RDP"
		case 5900:
			d.Name = "VNC"
		case 25, 465, 587, 993, 995:
			d.Name = "Email"
		case 1701, 1723, 500, 4500, 1194, 51820:
			d.Name = "VPN Services"
		case 1812, 1813:
			d.Name = "Radius"
		case 5060, 5061:
			d.Name = "VoIP (SIP)"
		case 1935:
			d.Name = "RTMP Streaming"
		case 5678:
			d.Name = "MikroTik MNDP"
		case 67, 68:
			d.Name = "DHCP"
		case 137, 138, 139:
			d.Name = "NetBIOS"
		case 20561, 2000:
			d.Name = "MikroTik BW Test"
		case 1900:
			d.Name = "SSDP"
		case 5353:
			d.Name = "mDNS"
		case 8080, 8443, 8888:
			d.Name = "Web Alternative"
		case 3306, 5432, 6379, 27017:
			d.Name = "Database"
		case 5222, 5223, 5228:
			d.Name = "Messaging/Push"
		case 3478, 3479, 3480, 3481:
			d.Name = "WebRTC/STUN"
		case 1883, 8883:
			d.Name = "MQTT (IoT)"
		default:
			if d.Port > 49151 {
				d.Name = "Dynamic/Private (" + strconv.Itoa(d.Port) + ")"
			} else {
				d.Name = "Service Port " + strconv.Itoa(d.Port)
			}
		}
		} else {
			d.Name = finalName
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
