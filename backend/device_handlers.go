package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-routeros/routeros"
	"github.com/gosnmp/gosnmp"
	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

// ──────────────────────────────────────────────────────────
// Device Handlers (CRUD)
// ──────────────────────────────────────────────────────────

func (a *appState) handleListDevices(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")

	var rows pgx.Rows
	var err error

	if wsIDStr != "" {
		wsID, convErr := strconv.Atoi(wsIDStr)
		if convErr != nil || wsID <= 0 {
			return c.String(http.StatusBadRequest, "invalid workspaceId")
		}
		rows, err = a.db.Query(ctx, `
			SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at, netflow_port, netflow_enabled
			FROM devices
			WHERE workspace_id = $1
			ORDER BY id
		`, wsID)
	} else {
		rows, err = a.db.Query(ctx, `
			SELECT id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at, netflow_port, netflow_enabled
			FROM devices
			ORDER BY id
		`)
	}

	if err != nil {
		log.Printf("list devices query error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query devices")
	}
	defer rows.Close()

	devices := make([]device, 0)
	for rows.Next() {
		var d device
		if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPassword, &d.ApiPort, &d.MonitoringEnabled, &d.PingIntervalMs, &d.MonitoredQueues, &d.MonitoredInterfaces, &d.WorkspaceID, &d.CreatedAt, &d.NetFlowPort, &d.NetFlowEnabled); err != nil {
			log.Printf("scan device error: %v", err)
			continue
		}
		devices = append(devices, d)
	}

	return c.JSON(http.StatusOK, devices)
}

func (a *appState) handleCreateDevice(c echo.Context) error {
	ctx := c.Request().Context()

	var req createDeviceRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("create device decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" || req.IP == "" || req.Type == "" || req.IntegrationMode == "" {
		return c.String(http.StatusBadRequest, "name, ip, type, and integrationMode are required")
	}

	if err := checkDeviceConnectivity(req); err != nil {
		log.Printf("device connectivity check failed for %s (%s): %v", req.Name, req.IP, err)
		return c.String(http.StatusBadRequest, fmt.Sprintf("gagal konek ke perangkat: %v", err))
	}

	if req.PingIntervalMs <= 0 {
		req.PingIntervalMs = 30000
	}

	var d device
	query := `
		INSERT INTO devices (name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, netflow_port, netflow_enabled)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at, netflow_port, netflow_enabled
	`
	if err := a.db.QueryRow(ctx, query,
		req.Name, req.IP, req.Type, req.IntegrationMode, req.SnmpVersion, req.SnmpCommunity,
		req.ApiUser, req.ApiPassword, req.ApiPort, req.MonitoringEnabled, req.PingIntervalMs,
		req.MonitoredQueues, req.MonitoredInterfaces, req.WorkspaceID, req.NetFlowPort, req.NetFlowEnabled,
	).Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPassword, &d.ApiPort, &d.MonitoringEnabled, &d.PingIntervalMs, &d.MonitoredQueues, &d.MonitoredInterfaces, &d.WorkspaceID, &d.CreatedAt, &d.NetFlowPort, &d.NetFlowEnabled); err != nil {
		log.Printf("create device insert error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create device")
	}

	return c.JSON(http.StatusCreated, d)
}

func (a *appState) handleUpdateDevice(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	var req createDeviceRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("update device decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.Name == "" || req.IP == "" || req.Type == "" || req.IntegrationMode == "" {
		return c.String(http.StatusBadRequest, "name, ip, type, and integrationMode are required")
	}

	if err := checkDeviceConnectivity(req); err != nil {
		log.Printf("device connectivity check failed for %s (%s): %v", req.Name, req.IP, err)
		return c.String(http.StatusBadRequest, fmt.Sprintf("gagal konek ke perangkat: %v", err))
	}

	if req.PingIntervalMs <= 0 {
		req.PingIntervalMs = 30000
	}

	var d device
	query := `
		UPDATE devices
		SET name = $1, ip = $2, type = $3, integration_mode = $4, snmp_version = $5,
		    snmp_community = $6, api_user = $7, api_password = $8, api_port = $9,
		    monitoring_enabled = $10, ping_interval_ms = $11, monitored_queues = $12,
		    monitored_interfaces = $13, workspace_id = $14, netflow_port = $15, netflow_enabled = $16
		WHERE id = $17
		RETURNING id, name, ip, type, integration_mode, snmp_version, snmp_community, api_user, api_password, api_port, monitoring_enabled, ping_interval_ms, monitored_queues, monitored_interfaces, workspace_id, created_at, netflow_port, netflow_enabled
	`
	if err := a.db.QueryRow(ctx, query,
		req.Name, req.IP, req.Type, req.IntegrationMode, req.SnmpVersion, req.SnmpCommunity,
		req.ApiUser, req.ApiPassword, req.ApiPort, req.MonitoringEnabled, req.PingIntervalMs,
		req.MonitoredQueues, req.MonitoredInterfaces, req.WorkspaceID, req.NetFlowPort, req.NetFlowEnabled, id,
	).Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.IntegrationMode, &d.SnmpVersion, &d.SnmpCommunity, &d.ApiUser, &d.ApiPassword, &d.ApiPort, &d.MonitoringEnabled, &d.PingIntervalMs, &d.MonitoredQueues, &d.MonitoredInterfaces, &d.WorkspaceID, &d.CreatedAt, &d.NetFlowPort, &d.NetFlowEnabled); err != nil {
		if err == pgx.ErrNoRows {
			return c.String(http.StatusNotFound, "device not found")
		}
		log.Printf("update device error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to update device")
	}

	return c.JSON(http.StatusOK, d)
}

func (a *appState) handleDeleteDevice(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	cmdTag, err := a.db.Exec(ctx, `DELETE FROM devices WHERE id = $1`, id)
	if err != nil {
		log.Printf("delete device error (id=%d): %v", id, err)
		return c.String(http.StatusInternalServerError, "failed to delete device")
	}
	if cmdTag.RowsAffected() == 0 {
		return c.String(http.StatusNotFound, "device not found")
	}

	return c.NoContent(http.StatusNoContent)
}

// ──────────────────────────────────────────────────────────
// Device Connectivity & Test Handlers
// ──────────────────────────────────────────────────────────

func (a *appState) handleTestDeviceConnection(c echo.Context) error {
	var req createDeviceRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		log.Printf("test device connection decode error: %v", err)
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.IP == "" || req.IntegrationMode == "" {
		return c.String(http.StatusBadRequest, "ip and integrationMode are required")
	}

	if err := checkDeviceConnectivity(req); err != nil {
		log.Printf("device test connectivity failed for %s (%s): %v", req.Name, req.IP, err)
		return c.JSON(http.StatusBadRequest, map[string]any{
			"status": "failed",
			"error":  fmt.Sprintf("gagal konek ke perangkat: %v", err),
		})
	}

	var queues []string
	var interfaces []string
	if req.IntegrationMode == "snmp" || req.IntegrationMode == "snmp+api" {
		if q, err := fetchAvailableQueues(req); err == nil {
			queues = q
		} else {
			log.Printf("fetchAvailableQueues failed during test: %v", err)
		}
		if ifaces, err := fetchAvailableInterfaces(req); err == nil {
			interfaces = ifaces
		} else {
			log.Printf("fetchAvailableInterfaces failed during test: %v", err)
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
		"status":              "ok",
		"message":             "koneksi ke perangkat berhasil",
		"availableQueues":     queues,
		"availableInterfaces": interfaces,
	})
}

func (a *appState) handleUpdatePingInterval(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.String(http.StatusBadRequest, "invalid device id")
	}

	var req struct {
		PingIntervalMs int `json:"pingIntervalMs"`
	}
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if req.PingIntervalMs < 10000 {
		req.PingIntervalMs = 30000
	}

	_, err = a.db.Exec(ctx, `UPDATE devices SET ping_interval_ms = $1 WHERE id = $2`, req.PingIntervalMs, id)
	if err != nil {
		log.Printf("update ping interval error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to update ping interval")
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// ──────────────────────────────────────────────────────────
// Connectivity Helper Functions
// ──────────────────────────────────────────────────────────

func checkDeviceConnectivity(req createDeviceRequest) error {
	_, err := pingDevice(req.IP, req.IntegrationMode, req.ApiPort, req.ApiUser, req.ApiPassword)
	if err != nil {
		return err
	}

	if req.IntegrationMode == "snmp" || req.IntegrationMode == "snmp+api" {
		gs := &gosnmp.GoSNMP{
			Target:    req.IP,
			Port:      161,
			Community: req.SnmpCommunity,
			Version:   gosnmp.Version2c,
			Timeout:   time.Duration(5) * time.Second,
			Retries:   2,
		}
		if req.SnmpVersion != nil && *req.SnmpVersion == "v1" {
			gs.Version = gosnmp.Version1
		}

		log.Printf("Testing SNMP connectivity to %s with community %s (version %s)", req.IP, req.SnmpCommunity, gs.Version)
		if err := gs.Connect(); err != nil {
			log.Printf("SNMP Connect error for %s: %v", req.IP, err)
			return fmt.Errorf("SNMP connection failed: %w", err)
		}
		defer gs.Conn.Close()

		if _, err = gs.Get([]string{".1.3.6.1.2.1.1.1.0"}); err != nil {
			log.Printf("SNMP Get error for %s: %v", req.IP, err)
			return fmt.Errorf("SNMP request failed (check community string): %w", err)
		}
		log.Printf("SNMP connectivity to %s successful", req.IP)
	}

	return nil
}

func pingDevice(ip string, integrationMode string, apiPort int, apiUser string, apiPassword string) (time.Duration, error) {
	timeout := 3 * time.Second
	start := time.Now()

	switch integrationMode {
	case "api", "snmp+api":
		if apiPort <= 0 {
			return 0, fmt.Errorf("apiPort must be > 0 for integrationMode %s", integrationMode)
		}
		addr := fmt.Sprintf("%s:%d", ip, apiPort)
		start = time.Now()
		connTCP, err := net.DialTimeout("tcp", addr, timeout)
		if err != nil {
			return 0, fmt.Errorf("cannot connect to Mikrotik TCP port: %w", err)
		}
		cRos, err := routeros.NewClient(connTCP)
		if err != nil {
			connTCP.Close()
			return 0, fmt.Errorf("cannot initialize Mikrotik client: %w", err)
		}
		err = cRos.Login(apiUser, apiPassword)
		cRos.Close()
		if err != nil {
			return 0, fmt.Errorf("cannot login to Mikrotik API: %w", err)
		}
		return time.Since(start), nil

	case "ping", "snmp":
		ipAddr := net.ParseIP(ip)
		if ipAddr == nil {
			return 0, fmt.Errorf("invalid IP address: %s", ip)
		}

		conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
		if err != nil {
			return 0, fmt.Errorf("failed to listen for ICMP: %w", err)
		}
		defer conn.Close()

		myID := os.Getpid() & 0xffff
		msg := icmp.Message{
			Type: ipv4.ICMPTypeEcho,
			Code: 0,
			Body: &icmp.Echo{
				ID:   myID,
				Seq:  1,
				Data: []byte("isp-monitoring-ping"),
			},
		}

		b, err := msg.Marshal(nil)
		if err != nil {
			return 0, fmt.Errorf("failed to marshal ICMP message: %w", err)
		}

		deadline := time.Now().Add(timeout)
		if err := conn.SetDeadline(deadline); err != nil {
			return 0, fmt.Errorf("failed to set ICMP deadline: %w", err)
		}

		start = time.Now()
		if _, err := conn.WriteTo(b, &net.IPAddr{IP: ipAddr}); err != nil {
			return 0, fmt.Errorf("failed to send ICMP echo: %w", err)
		}

		for {
			resp := make([]byte, 1500)
			n, peer, err := conn.ReadFrom(resp)
			if err != nil {
				return 0, fmt.Errorf("receive error: %w", err)
			}

			if peer.String() != ipAddr.String() {
				if time.Now().After(deadline) {
					break
				}
				continue
			}

			rm, err := icmp.ParseMessage(1, resp[:n])
			if err != nil {
				continue
			}

			if rm.Type == ipv4.ICMPTypeEchoReply {
				if pkt, ok := rm.Body.(*icmp.Echo); ok && pkt.ID == myID {
					return time.Since(start), nil
				}
			}

			if time.Now().After(deadline) {
				break
			}
		}
		return 0, fmt.Errorf("ping timeout or invalid response")

	default:
		return 0, fmt.Errorf("unsupported integrationMode: %s", integrationMode)
	}
}

func fetchAvailableQueues(req createDeviceRequest) ([]string, error) {
	gs := &gosnmp.GoSNMP{
		Target:    req.IP,
		Port:      161,
		Community: req.SnmpCommunity,
		Version:   gosnmp.Version2c,
		Timeout:   time.Duration(5) * time.Second,
		Retries:   1,
	}
	if req.SnmpVersion != nil && *req.SnmpVersion == "v1" {
		gs.Version = gosnmp.Version1
	}

	if err := gs.Connect(); err != nil {
		return nil, err
	}
	defer gs.Conn.Close()

	queues := make([]string, 0)
	err := gs.Walk(".1.3.6.1.4.1.14988.1.1.2.1.1.2", func(p gosnmp.SnmpPDU) error {
		var name string
		switch v := p.Value.(type) {
		case []byte:
			name = string(v)
		case string:
			name = v
		default:
			name = fmt.Sprintf("%v", v)
		}
		if name != "" {
			queues = append(queues, name)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return queues, nil
}

func fetchAvailableInterfaces(req createDeviceRequest) ([]string, error) {
	gs := &gosnmp.GoSNMP{
		Target:    req.IP,
		Port:      161,
		Community: req.SnmpCommunity,
		Version:   gosnmp.Version2c,
		Timeout:   time.Duration(5) * time.Second,
		Retries:   1,
	}
	if req.SnmpVersion != nil && *req.SnmpVersion == "v1" {
		gs.Version = gosnmp.Version1
	}

	if err := gs.Connect(); err != nil {
		return nil, err
	}
	defer gs.Conn.Close()

	ifaces := make([]string, 0)
	err := gs.Walk(".1.3.6.1.2.1.2.2.1.2", func(p gosnmp.SnmpPDU) error {
		var name string
		switch v := p.Value.(type) {
		case []byte:
			name = string(v)
		case string:
			name = v
		default:
			name = fmt.Sprintf("%v", v)
		}
		if name != "" {
			ifaces = append(ifaces, name)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return ifaces, nil
}
