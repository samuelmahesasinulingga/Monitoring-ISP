package main

import (
	"context"
	"encoding/binary"
	"log"
	"net"
	"time"

	"github.com/jackc/pgx/v5"
)

type sFlowPacket struct {
	WorkspaceID int
	AgentIP     string
	SrcIP       string
	DstIP       string
	Protocol    int
	SrcPort     int
	DstPort     int
	Bytes       int64
	Packets     int
}

func startSFlowCollector(state *appState) {
	// Listen on UDP 6343
	addr := net.UDPAddr{
		Port: 6343,
		IP:   net.ParseIP("0.0.0.0"),
	}
	conn, err := net.ListenUDP("udp", &addr)
	if err != nil {
		log.Printf("SFlow Collector: Failed to listen on UDP 6343: %v", err)
		return
	}
	defer conn.Close()

	log.Println("SFlow Collector: Listening on UDP 6343")

	// Channel for batching
	packetChan := make(chan sFlowPacket, 1000)

	// Start worker for DB insertion
	go sFlowDBWorker(state, packetChan)

	// Start NetFlow collector on 2055
	go startNetFlowCollector(state, packetChan)

	buf := make([]byte, 8192)
	for {
		n, remoteAddr, err := conn.ReadFromUDP(buf)
		if err != nil {
			log.Printf("SFlow Collector: Error reading UDP: %v", err)
			continue
		}

		// Handle packet in a separate go routine to not block the listener
		// In a real high-traffic environment, we might use a worker pool here
		processSFlowPacket(state, remoteAddr.IP.String(), buf[:n], packetChan)
	}
}

func processSFlowPacket(state *appState, agentIP string, data []byte, out chan<- sFlowPacket) {
	// Simple sFlow v5 Header Check
	if len(data) < 24 {
		return
	}

	version := binary.BigEndian.Uint32(data[0:4])
	if version != 5 {
		return
	}

	// sFlow v5 Header:
	// 0-3: Version (v5)
	// 4-7: Address Type (1=IPv4, 2=IPv6)
	// 8-11: Agent Address (If IPv4)
	// ... 24-27: Number of Samples
	
	ipType := binary.BigEndian.Uint32(data[4:8])
	actualAgentIP := agentIP // Default to UDP source IP

	if ipType == 1 && len(data) >= 12 {
		actualAgentIP = net.IP(data[8:12]).String()
	} else if ipType == 2 && len(data) >= 24 {
		actualAgentIP = net.IP(data[8:24]).String()
	}

	wsID := 1
	var foundWsID int
	// TRIPLE CHECK: Search by the INTERNAL IP first (important for Docker/NAT)
	err := state.db.QueryRow(context.Background(), "SELECT workspace_id FROM devices WHERE ip = $1 LIMIT 1", actualAgentIP).Scan(&foundWsID)
	if err != nil {
		// Second attempt: Search by the UDP sender IP
		err = state.db.QueryRow(context.Background(), "SELECT workspace_id FROM devices WHERE ip = $1 LIMIT 1", agentIP).Scan(&foundWsID)
	}

	if err == nil {
		wsID = foundWsID
	} else {
		// If we still can't find it, and it's from Docker Gateway, don't just guess R-Samuel.
		// Let it stay as ws 1 but keep the actualAgentIP so we can see it in logs/UI as unknown.
		log.Printf("SFlow: Warning - No device matches IP %s or %s in database.", actualAgentIP, agentIP)
	}

	if len(data) < 28 {
		return
	}

	sampleCount := int(binary.BigEndian.Uint32(data[24:28]))
	offset := 28

	// Reduce log noise in production, but keep it for now for debugging
	if sampleCount > 0 {
		log.Printf("SFlow: [%s] Received %d samples from router (Remote: %s)", actualAgentIP, sampleCount, agentIP)
	}

	for i := 0; i < sampleCount; i++ {

		if offset+8 > len(data) {
			break
		}

		sampleHeader := binary.BigEndian.Uint32(data[offset : offset+4])
		sampleLen := int(binary.BigEndian.Uint32(data[offset+4 : offset+8]))
		offset += 8

		if offset+sampleLen > len(data) {
			break
		}

		// Enterprise 0, Sample Type 1 (Flow Sample)
		if sampleHeader == 1 {
			parseFlowSample(wsID, actualAgentIP, data[offset:offset+sampleLen], out)
		}

		offset += sampleLen
	}
}

func parseFlowSample(wsID int, agentIP string, data []byte, out chan<- sFlowPacket) {
	if len(data) < 32 {
		return
	}

	// Flow Sample has its own header, skip it (approx 20-30 bytes depending on records)
	// We are looking for Flow Records inside.
	recordCount := int(binary.BigEndian.Uint32(data[28:32]))
	offset := 32

	for i := 0; i < recordCount; i++ {
		if offset+8 > len(data) {
			break
		}

		recordHeader := binary.BigEndian.Uint32(data[offset : offset+4])
		recordLen := int(binary.BigEndian.Uint32(data[offset+4 : offset+8]))
		offset += 8

		if offset+recordLen > len(data) {
			break
		}

		// Enterprise 0, Format 1 (Raw Packet Header)
		if recordHeader == 1 {
			parseRawPacketHeader(wsID, agentIP, data[offset:offset+recordLen], out)
		}

		offset += recordLen
	}
}

func parseRawPacketHeader(wsID int, agentIP string, data []byte, out chan<- sFlowPacket) {
	if len(data) < 16 {
		return
	}

	// header_protocol (e.g. Ethernet = 1)
	headerProto := binary.BigEndian.Uint32(data[0:4])
	frameLen := binary.BigEndian.Uint32(data[4:8])
	headerLen := int(binary.BigEndian.Uint32(data[12:16]))

	if headerProto != 1 || len(data) < 16+headerLen {
		return
	}

	ethHeader := data[16 : 16+headerLen]
	if len(ethHeader) < 14 {
		return
	}

	// Ethernet Type
	ethType := binary.BigEndian.Uint16(ethHeader[12:14])
	if ethType != 0x0800 { // IPv4
		return
	}

	ipHeader := ethHeader[14:]
	if len(ipHeader) < 20 {
		return
	}

	proto := int(ipHeader[9])
	srcIP := net.IP(ipHeader[12:16]).String()
	dstIP := net.IP(ipHeader[16:20]).String()

	var srcPort, dstPort int
	if proto == 6 || proto == 17 { // TCP or UDP
		if len(ipHeader) >= 24 {
			srcPort = int(binary.BigEndian.Uint16(ipHeader[20:22]))
			dstPort = int(binary.BigEndian.Uint16(ipHeader[22:24]))
		}
	}

	out <- sFlowPacket{
		WorkspaceID: wsID,
		AgentIP:     agentIP,
		SrcIP:       srcIP,
		DstIP:       dstIP,
		Protocol:    proto,
		SrcPort:     srcPort,
		DstPort:     dstPort,
		Bytes:       int64(frameLen),
		Packets:     1,
	}
}

func startNetFlowCollector(state *appState, out chan<- sFlowPacket) {
	addr := net.UDPAddr{
		Port: 2055,
		IP:   net.ParseIP("0.0.0.0"),
	}
	conn, err := net.ListenUDP("udp", &addr)
	if err != nil {
		log.Printf("NetFlow Collector: Failed to listen on UDP 2055: %v", err)
		return
	}
	defer conn.Close()

	log.Println("NetFlow Collector: Listening on UDP 2055")

	buf := make([]byte, 8192)
	for {
		n, remoteAddr, err := conn.ReadFromUDP(buf)
		if err != nil {
			continue
		}

		processNetFlowPacket(state, remoteAddr.IP.String(), buf[:n], out)
	}
}

func processNetFlowPacket(state *appState, agentIP string, data []byte, out chan<- sFlowPacket) {
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
	if err != nil && (agentIP == "172.21.0.1" || agentIP == "172.17.0.1" || agentIP == "127.0.0.1") {
		// FALLBACK: If coming from Gateway, check which workspace has exactly one router or just take first
		state.db.QueryRow(context.Background(), "SELECT id FROM workspaces LIMIT 1").Scan(&foundWsID)
	}
	
	if foundWsID > 0 {
		wsID = foundWsID
	}

	actualAgentIP := agentIP
	if agentIP == "172.21.0.1" || agentIP == "172.17.0.1" || agentIP == "127.0.0.1" {
		var firstDeviceIP string
		state.db.QueryRow(context.Background(), "SELECT ip FROM devices WHERE workspace_id = $1 LIMIT 1", wsID).Scan(&firstDeviceIP)
		if firstDeviceIP != "" {
			actualAgentIP = firstDeviceIP
		}
	}

	if count > 0 {
		log.Printf("NetFlow: [%s] Received %d flows from router (Remote: %s)", actualAgentIP, count, agentIP)
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

		out <- sFlowPacket{
			WorkspaceID: wsID,
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

func sFlowDBWorker(state *appState, packets <-chan sFlowPacket) {
	batchSize := 100
	ticker := time.NewTicker(5 * time.Second)
	var batch []sFlowPacket

	flush := func() {
		if len(batch) == 0 {
			return
		}

		ctx := context.Background()
		
		// Use copy for high speed insertion if needed, but for now batch insert
		// pgx Batch is better for this
		b := &pgx.Batch{}
		for _, p := range batch {
			b.Queue("INSERT INTO flow_logs (workspace_id, agent_ip, src_ip, dst_ip, protocol, src_port, dst_port, bytes, packets) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
				p.WorkspaceID, p.AgentIP, p.SrcIP, p.DstIP, p.Protocol, p.SrcPort, p.DstPort, p.Bytes, p.Packets)
		}

		results := state.db.SendBatch(ctx, b)
		if err := results.Close(); err != nil {
			log.Printf("SFlow Worker: Batch insert error: %v", err)
		}

		// Periodically aggregate into summaries
		// Actually, we can do this once a day or via a separate job
		// For Big Data demo, we'll keep it simple: Raw logs for dashboard.

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
