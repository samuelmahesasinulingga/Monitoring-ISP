package main

import (
	"context"
	"encoding/binary"
	"log"
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

var (
	activeListeners   = make(map[int]*net.UDPConn)
	activeListenersMu sync.Mutex
)

func startNetFlowCollector(state *appState) {
	rawChan := make(chan NetFlowRecord, 2000)
	dbChan := make(chan NetFlowRecord, 1000)
	secChan := make(chan NetFlowRecord, 1000)

	// Dispatcher: Fan-out records to multiple consumers
	go func() {
		for p := range rawChan {
			// Non-blocking sends or small buffers to avoid one slow consumer blocking all
			select {
			case dbChan <- p:
			default:
			}
			select {
			case secChan <- p:
			default:
			}
		}
	}()

	go netFlowDBWorker(state, dbChan)
	go startSecurityDetector(state, secChan)

	// Periodically refresh listeners based on devices in DB
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		// Initial refresh
		refreshListeners(state, rawChan)

		for range ticker.C {
			refreshListeners(state, rawChan)
		}
	}()
}

func refreshListeners(state *appState, packetChan chan NetFlowRecord) {
	ctx := context.Background()
	rows, err := state.db.Query(ctx, "SELECT DISTINCT netflow_port FROM devices WHERE netflow_enabled = TRUE")
	if err != nil {
		log.Printf("NetFlow Manager: Failed to query ports: %v", err)
		return
	}
	defer rows.Close()

	targetPorts := make(map[int]bool)
	for rows.Next() {
		var p int
		if err := rows.Scan(&p); err == nil && p > 0 {
			targetPorts[p] = true
		}
	}

	activeListenersMu.Lock()
	defer activeListenersMu.Unlock()

	// Stop listeners for ports no longer in DB
	for port, conn := range activeListeners {
		if !targetPorts[port] {
			log.Printf("NetFlow Manager: Stopping listener on port %d", port)
			conn.Close()
			delete(activeListeners, port)
		}
	}

	// Start listeners for new ports
	for port := range targetPorts {
		if _, exists := activeListeners[port]; !exists {
			log.Printf("NetFlow Manager: Starting listener on port %d", port)
			addr := net.UDPAddr{
				Port: port,
				IP:   net.ParseIP("0.0.0.0"),
			}
			conn, err := net.ListenUDP("udp", &addr)
			if err != nil {
				log.Printf("NetFlow Manager: Failed to listen on UDP %d: %v", port, err)
				continue
			}
			activeListeners[port] = conn

			go func(p int, c *net.UDPConn) {
				buf := make([]byte, 8192)
				for {
					n, remoteAddr, err := c.ReadFromUDP(buf)
					if err != nil {
						// Listener likely closed
						return
					}
					processNetFlowPacket(state, remoteAddr.IP.String(), p, buf[:n], packetChan)
				}
			}(port, conn)
		}
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
	
	// Identify device and verify it has NetFlow enabled
	var wsID, deviceID int
	var netflowEnabled bool
	
	// 1. Precise Match: IP + Port
	err := state.db.QueryRow(context.Background(), 
		"SELECT id, workspace_id, netflow_enabled FROM devices WHERE ip = $1 AND netflow_port = $2 LIMIT 1", 
		agentIP, localPort).Scan(&deviceID, &wsID, &netflowEnabled)
	
	if err != nil {
		// 2. NAT Fallback: Port only (for multiple routers behind same public IP)
		err = state.db.QueryRow(context.Background(), 
			"SELECT id, workspace_id, netflow_enabled FROM devices WHERE netflow_port = $1 LIMIT 1", 
			localPort).Scan(&deviceID, &wsID, &netflowEnabled)
		
		if err != nil {
			// 3. Last Fallback: IP only
			state.db.QueryRow(context.Background(), 
				"SELECT id, workspace_id, netflow_enabled FROM devices WHERE ip = $1 LIMIT 1", 
				agentIP).Scan(&deviceID, &wsID, &netflowEnabled)
		}
	}

	// If device not found or NetFlow disabled, drop packet
	if deviceID == 0 || !netflowEnabled {
		return
	}

	if count > 0 {
		// Log every packet temporarily for debugging
		log.Printf("NetFlow: [%s] Menerima %d flows dari router (ID: %d, Port: %d)", agentIP, count, deviceID, localPort)
	}

	// SAMPLING LOGIC based on Workspace Settings
	mode, interval := getWorkspaceNetFlowSettings(state, wsID)

	if mode == "snapshot" && interval > 0 {
		now := time.Now()
		isWindowOpen := (now.Minute()%interval == 0) && (now.Second() < 10)
		if !isWindowOpen {
			return
		}
	} else {
		// Temporarily disabled sampling to ensure data visibility
		// if rand.Intn(100) >= 10 {
		// 	return 
		// }
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
			AgentIP:     agentIP,
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
