package main

import "time"

type device struct {
	ID                int       `json:"id"`
	Name              string    `json:"name"`
	IP                string    `json:"ip"`
	Type              string    `json:"type"`
	IntegrationMode   string    `json:"integrationMode"`
	SnmpVersion       *string   `json:"snmpVersion,omitempty"`
	SnmpCommunity     string    `json:"snmpCommunity"`
	ApiUser           string    `json:"apiUser"`
	ApiPassword       string    `json:"apiPassword"`
	ApiPort           int       `json:"apiPort"`
	MonitoringEnabled bool      `json:"monitoringEnabled"`
	PingIntervalMs    int       `json:"pingIntervalMs"`
	MonitoredQueues   []string  `json:"monitoredQueues"`
	MonitoredInterfaces []string `json:"monitoredInterfaces"`
	WorkspaceID       *int      `json:"workspaceId,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type createDeviceRequest struct {
	Name              string  `json:"name"`
	IP                string  `json:"ip"`
	Type              string  `json:"type"`
	IntegrationMode   string  `json:"integrationMode"`
	SnmpVersion       *string `json:"snmpVersion"`
	SnmpCommunity     string  `json:"snmpCommunity"`
	ApiUser           string  `json:"apiUser"`
	ApiPassword       string  `json:"apiPassword"`
	ApiPort           int     `json:"apiPort"`
	MonitoringEnabled bool    `json:"monitoringEnabled"`
	PingIntervalMs    int       `json:"pingIntervalMs"`
	MonitoredQueues   []string  `json:"monitoredQueues"`
	MonitoredInterfaces []string `json:"monitoredInterfaces"`
	WorkspaceID       *int      `json:"workspaceId"`
}

type HistoricalPing struct {
	Time      string `json:"time"`
	LatencyMs int64  `json:"latencyMs"`
	Status    string `json:"status"`
}

type devicePingResult struct {
	ID             int              `json:"id"`
	Name           string           `json:"name"`
	IP             string           `json:"ip"`
	IntegrationMode string           `json:"integrationMode"`
	LatencyMs      int64            `json:"latencyMs"`
	Loss           float64          `json:"loss"`
	Status         string           `json:"status"`
	PingIntervalMs int              `json:"pingIntervalMs"`
	MonitoredQueues []string        `json:"monitoredQueues"`
	MonitoredInterfaces []string     `json:"monitoredInterfaces"`
	History        []HistoricalPing `json:"history"`
}

type devicePingLog struct {
	ID        int       `json:"id"`
	DeviceID  int       `json:"deviceId"`
	LatencyMs int       `json:"latencyMs"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type deviceAlert struct {
	ID         int       `json:"id"`
	DeviceID   int       `json:"deviceId"`
	DeviceName string    `json:"deviceName"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
}

