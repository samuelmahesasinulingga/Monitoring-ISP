package main

import (
	"log"
	"net/http"
	"runtime"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

func (a *appState) handleSystemMetrics(c echo.Context) error {
	// Host Info
	hInfo, err := host.Info()
	if err != nil {
		log.Printf("host info error: %v", err)
	}

	// CPU Info
	cpuInfo, err := cpu.Info()
	cores := 0
	if err == nil && len(cpuInfo) > 0 {
		for _, c := range cpuInfo {
			cores += int(c.Cores)
		}
		if cores == 0 {
			cores = runtime.NumCPU() // fallback
		}
	} else {
		cores = runtime.NumCPU()
	}

	cpuPercent, err := cpu.Percent(time.Second, false)
	cpuUsage := 0.0
	if err == nil && len(cpuPercent) > 0 {
		cpuUsage = cpuPercent[0]
	}

	// Memory Info
	vMem, err := mem.VirtualMemory()
	if err != nil {
		log.Printf("mem info error: %v", err)
	}

	// Disk Usage
	// Get partitions to find the root/main drive
	parts, err := disk.Partitions(false)
	var rootPath string
	if err == nil && len(parts) > 0 {
		// Try to find "/", if not found just use the first partition's mountpoint (useful for windows like C:)
		rootPath = parts[0].Mountpoint
		for _, p := range parts {
			if p.Mountpoint == "/" || p.Mountpoint == `C:\` {
				rootPath = p.Mountpoint
				break
			}
		}
	} else {
		rootPath = "/"
	}

	dUsage, err := disk.Usage(rootPath)
	if err != nil {
		log.Printf("disk usage error: %v", err)
	}

	// Network I/O
	netIO, err := net.IOCounters(false) // all interfaces combined
	var rxBytes, txBytes uint64
	if err == nil && len(netIO) > 0 {
		rxBytes = netIO[0].BytesRecv
		txBytes = netIO[0].BytesSent
	}

	// Disk I/O
	diskIO, err := disk.IOCounters()
	var readBytes, writeBytes uint64
	if err == nil {
		for _, io := range diskIO {
			readBytes += io.ReadBytes
			writeBytes += io.WriteBytes
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"serverInfo": map[string]interface{}{
			"hostname":  hInfo.Hostname,
			"os":        hInfo.Platform + " " + hInfo.PlatformVersion,
			"kernel":    hInfo.KernelVersion,
			"uptime":    hInfo.Uptime, // in seconds
			"cpuCores":  cores,
		},
		"memory": map[string]interface{}{
			"total": vMem.Total,
			"used":  vMem.Used,
			"free":  vMem.Free,
		},
		"storage": map[string]interface{}{
			"total": dUsage.Total,
			"used":  dUsage.Used,
			"free":  dUsage.Free,
		},
		"cpu": map[string]interface{}{
			"usagePercent": cpuUsage,
		},
		"networkIO": map[string]interface{}{
			"rxBytes": rxBytes,
			"txBytes": txBytes,
		},
		"diskIO": map[string]interface{}{
			"readBytes":  readBytes,
			"writeBytes": writeBytes,
		},
	})
}
