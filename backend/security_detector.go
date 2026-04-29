package main

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

type SecurityDetector struct {
	state *appState
	mu    sync.Mutex
	// DDoS tracking: DstIP -> Packets in current window
	// Key: DstIP, Val: count of packets
	dstPPS map[string]int
	// Port Scan tracking: SrcIP -> Set of unique DstPorts
	srcPorts map[string]map[int]bool
	
	// Track which workspace/device the IP belongs to (best effort)
	ipToMetadata map[string]struct{wsID, devID int}
}

func startSecurityDetector(state *appState, packets <-chan NetFlowRecord) {
	detector := &SecurityDetector{
		state:        state,
		dstPPS:       make(map[string]int),
		srcPorts:     make(map[string]map[int]bool),
		ipToMetadata: make(map[string]struct{wsID, devID int}),
	}

	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case p := <-packets:
			detector.processRecord(p)
		case <-ticker.C:
			detector.analyzeAndFlush()
		}
	}
}

func (d *SecurityDetector) processRecord(p NetFlowRecord) {
	d.mu.Lock()
	defer d.mu.Unlock()

	// DDoS: Track packets destined to an IP (Incoming DDoS)
	d.dstPPS[p.DstIP] += p.Packets

	// Port Scan: Track unique ports contacted by a source
	if _, ok := d.srcPorts[p.SrcIP]; !ok {
		d.srcPorts[p.SrcIP] = make(map[int]bool)
	}
	d.srcPorts[p.SrcIP][p.DstPort] = true

	// Store metadata for alert creation
	d.ipToMetadata[p.DstIP] = struct{wsID, devID int}{p.WorkspaceID, p.DeviceID}
	d.ipToMetadata[p.SrcIP] = struct{wsID, devID int}{p.WorkspaceID, p.DeviceID}
}

func (d *SecurityDetector) analyzeAndFlush() {
	d.mu.Lock()
	currentPPS := d.dstPPS
	currentPorts := d.srcPorts
	metadata := d.ipToMetadata
	
	// Reset trackers
	d.dstPPS = make(map[string]int)
	d.srcPorts = make(map[string]map[int]bool)
	d.ipToMetadata = make(map[string]struct{wsID, devID int})
	d.mu.Unlock()

	ctx := context.Background()

	// 1. DDoS Detection
	// Threshold: > 100,000 packets per minute (~1,666 PPS) - Adjust as needed for ISP scale
	for ip, packets := range currentPPS {
		if packets > 100000 {
			m := metadata[ip]
			d.createAlert(ctx, m.wsID, m.devID, "DDoS", "", ip, "high", 
				fmt.Sprintf("Terdeteksi anomali trafik tinggi ke IP %s (%d paket/menit). Potensi serangan DDoS.", ip, packets), float64(packets))
		}
	}

	// 2. Port Scan Detection
	// Threshold: > 50 unique ports contacted in a minute from a single source
	for ip, ports := range currentPorts {
		uniquePorts := len(ports)
		if uniquePorts > 50 {
			m := metadata[ip]
			d.createAlert(ctx, m.wsID, m.devID, "Port Scan", ip, "", "medium", 
				fmt.Sprintf("IP %s melakukan scanning ke %d port unik dalam 1 menit.", ip, uniquePorts), float64(uniquePorts))
		}
	}
}

func (d *SecurityDetector) createAlert(ctx context.Context, wsID, devID int, alertType, srcIP, dstIP, severity, desc string, val float64) {
	log.Printf("[SECURITY] %s Alert for WS %d: %s", alertType, wsID, desc)
	
	_, err := d.state.db.Exec(ctx, `
		INSERT INTO security_alerts (workspace_id, device_id, alert_type, source_ip, destination_ip, severity, description, metric_value)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, wsID, devID, alertType, srcIP, dstIP, severity, desc, val)
	
	if err != nil {
		log.Printf("Error saving security alert: %v", err)
	}
}
