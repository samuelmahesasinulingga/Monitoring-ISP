package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSecurityDetector_DDoS(t *testing.T) {
	// Note: This test requires a mock db or a test db connection
	// Since we are testing the logic, we might need to refactor SecurityDetector 
	// to take an interface for the DB, but for now let's see if we can just test the tracking logic.
	
	detector := &SecurityDetector{
		dstPPS:       make(map[string]int),
		srcPorts:     make(map[string]map[int]bool),
		ipToMetadata: make(map[string]struct{wsID, devID int}),
	}

	// Simulate DDoS traffic: > 100,000 packets to 1.1.1.1
	detector.processRecord(NetFlowRecord{
		DstIP:   "1.1.1.1",
		Packets: 100001,
		WorkspaceID: 1,
		DeviceID:    1,
	})

	assert.Equal(t, 100001, detector.dstPPS["1.1.1.1"])
	assert.Equal(t, 1, detector.ipToMetadata["1.1.1.1"].wsID)
}

func TestSecurityDetector_PortScan(t *testing.T) {
	detector := &SecurityDetector{
		dstPPS:       make(map[string]int),
		srcPorts:     make(map[string]map[int]bool),
		ipToMetadata: make(map[string]struct{wsID, devID int}),
	}

	// Simulate Port Scan: Source 2.2.2.2 contacts 51 different ports
	for i := 1; i <= 51; i++ {
		detector.processRecord(NetFlowRecord{
			SrcIP:   "2.2.2.2",
			DstPort: i,
			WorkspaceID: 1,
			DeviceID:    1,
		})
	}

	assert.Equal(t, 51, len(detector.srcPorts["2.2.2.2"]))
}
