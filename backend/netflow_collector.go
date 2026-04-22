package main

import (
	"context"
	"encoding/binary"
	"log"
	"math/rand"
	"net"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
)

type NetFlowRecord struct {
	WorkspaceID int
	DeviceID    int
	AgentIP     string
	SrcIP       string
	DstIP       string
	Protocol    int
	SrcPort     int
	DstPort     int
	Bytes       int64
	Packets     int
}

func startNetFlowCollector(state *appState) {
	packetChan := make(chan NetFlowRecord, 1000)
	go netFlowDBWorker(state, packetChan)

	// Listen on multiple ports (default range 2055-2060)
	for port := 2055; port <= 2060; port++ {
		go func(p int) {
			addr := net.UDPAddr{
				Port: p,
				IP:   net.ParseIP("0.0.0.0"),
			}
			conn, err := net.ListenUDP("udp", &addr)
			if err != nil {
				log.Printf("NetFlow Collector: Failed to listen on UDP %d: %v", p, err)
				return
			}
			defer conn.Close()

			log.Printf("NetFlow Collector: Listening on UDP %d", p)

			buf := make([]byte, 8192)
			for {
				n, remoteAddr, err := conn.ReadFromUDP(buf)
				if err != nil {
					continue
				}

				processNetFlowPacket(state, remoteAddr.IP.String(), p, buf[:n], packetChan)
			}
		}(port)
	}
}

var wsSettingsCache = make(map[int]workspaceSettings)
var wsSettingsMutex sync.RWMutex

type workspaceSettings struct {
	Mode     string
	Interval int
	Expiry   time.Time
}

func getWorkspaceNetFlowSettings(state *appState, wsID int) (string, int) {
	wsSettingsMutex.RLock()
	s, ok := wsSettingsCache[wsID]
	wsSettingsMutex.RUnlock()

	if ok && time.Now().Before(s.Expiry) {
		return s.Mode, s.Interval
	}

	// Cache miss or expired (cache for 30 seconds)
	var mode string
	var interval int
	err := state.db.QueryRow(context.Background(), "SELECT netflow_monitoring_mode, netflow_snapshot_interval FROM workspaces WHERE id = $1", wsID).Scan(&mode, &interval)
	if err != nil {
		mode = "continuous"
		interval = 0
	}

	wsSettingsMutex.Lock()
	wsSettingsCache[wsID] = workspaceSettings{
		Mode:     mode,
		Interval: interval,
		Expiry:   time.Now().Add(30 * time.Second),
	}
	wsSettingsMutex.Unlock()

	return mode, interval
}

func processNetFlowPacket(state *appState, agentIP string, localPort int, data []byte, out chan<- NetFlowRecord) {
	if len(data) < 24 {
		return
	}

	version := binary.BigEndian.Uint16(data[0:2])
	if version != 5 {
		return // We focus on v5 for MikroTik Traffic Flow
	}

	count := int(binary.BigEndian.Uint16(data[2:4]))
	
	wsID := 1
	var foundWsID int
	// If it's a Docker Gateway IP, we try to match by workspace
	err := state.db.QueryRow(context.Background(), "SELECT workspace_id FROM devices WHERE ip = $1 LIMIT 1", agentIP).Scan(&foundWsID)
	if err != nil && (agentIP == "172.21.0.1" || agentIP == "172.17.0.1" || agentIP == "127.0.0.1" || agentIP == "::1") {
		state.db.QueryRow(context.Background(), "SELECT id FROM workspaces ORDER BY id ASC LIMIT 1").Scan(&foundWsID)
	}
	
	if foundWsID > 0 {
		wsID = foundWsID
	}

	actualAgentIP := agentIP
	var deviceID int

	// Better identification logic:
	// 1. First, check if there's a device specifically mapped to this IP and this Port
	err = state.db.QueryRow(context.Background(), "SELECT id, ip FROM devices WHERE workspace_id = $1 AND ip = $2 AND netflow_port = $3 LIMIT 1", wsID, agentIP, localPort).Scan(&deviceID, &actualAgentIP)
	
	if err != nil {
		if agentIP == "172.21.0.1" || agentIP == "172.17.0.1" || agentIP == "127.0.0.1" || agentIP == "::1" {
			// 2. If it's a NAT gateway, find the device that is configured to use THIS specific local port
			err = state.db.QueryRow(context.Background(), "SELECT id, ip FROM devices WHERE workspace_id = $1 AND netflow_port = $2 ORDER BY id ASC LIMIT 1", wsID, localPort).Scan(&deviceID, &actualAgentIP)
			if err != nil {
				// Fallback to first device
				state.db.QueryRow(context.Background(), "SELECT id, ip FROM devices WHERE workspace_id = $1 ORDER BY id ASC LIMIT 1", wsID).Scan(&deviceID, &actualAgentIP)
			}
		} else {
			// 3. Last fallback: Try finding device by IP only (if port doesn't match or not provided)
			state.db.QueryRow(context.Background(), "SELECT id FROM devices WHERE workspace_id = $1 AND ip = $2 LIMIT 1", wsID, agentIP).Scan(&deviceID)
		}
	}

	if count > 0 {
		log.Printf("NetFlow: [%s] Received %d flows from router (Remote: %s, DeviceID: %d)", actualAgentIP, count, agentIP, deviceID)
	}

	// SAMPLING LOGIC based on Workspace Settings
	mode, interval := getWorkspaceNetFlowSettings(state, wsID)

	if mode == "snapshot" && interval > 0 {
		// SNAPSHOT MODE: Only collect for the first 10 seconds of every 'interval' minutes
		now := time.Now()
		isWindowOpen := (now.Minute()%interval == 0) && (now.Second() < 10)
		if !isWindowOpen {
			return // Discard data outside the snapshot window
		}
	} else {
		// CONTINUOUS MODE: Random Sampling (10%) to save storage while maintaining visibility
		if rand.Intn(100) >= 10 {
			return // Discard 90% of logs to save storage
		}
	}

	offset := 24
	for i := 0; i < count; i++ {
		if offset+48 > len(data) {
			break
		}

		record := data[offset : offset+48]
		srcIP := net.IP(record[0:4]).String()
		dstIP := net.IP(record[4:8]).String()
		packets := binary.BigEndian.Uint32(record[16:20])
		octets := binary.BigEndian.Uint32(record[20:24])
		srcPort := int(binary.BigEndian.Uint16(record[32:34]))
		dstPort := int(binary.BigEndian.Uint16(record[34:36]))
		proto := int(record[38])

		out <- NetFlowRecord{
			WorkspaceID: wsID,
			DeviceID:    deviceID,
			AgentIP:     actualAgentIP,
			SrcIP:       srcIP,
			DstIP:       dstIP,
			Protocol:    proto,
			SrcPort:     srcPort,
			DstPort:     dstPort,
			Bytes:       int64(octets),
			Packets:     int(packets),
		}

		offset += 48
	}
}

func netFlowDBWorker(state *appState, packets <-chan NetFlowRecord) {
	batchSize := 100
	ticker := time.NewTicker(5 * time.Second)
	var batch []NetFlowRecord

	flush := func() {
		if len(batch) == 0 {
			return
		}

		ctx := context.Background()
		b := &pgx.Batch{}
		for _, p := range batch {
			b.Queue("INSERT INTO flow_logs (workspace_id, device_id, agent_ip, src_ip, dst_ip, protocol, src_port, dst_port, bytes, packets) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
				p.WorkspaceID, p.DeviceID, p.AgentIP, p.SrcIP, p.DstIP, p.Protocol, p.SrcPort, p.DstPort, p.Bytes, p.Packets)
		}

		results := state.db.SendBatch(ctx, b)
		if err := results.Close(); err != nil {
			log.Printf("NetFlow Worker: Batch insert error: %v", err)
		}

		batch = batch[:0]
	}

	for {
		select {
		case p := <-packets:
			batch = append(batch, p)
			if len(batch) >= batchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}
