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
	ApiPort           int       `json:"apiPort"`
	MonitoringEnabled bool      `json:"monitoringEnabled"`
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
	ApiPort           int     `json:"apiPort"`
	MonitoringEnabled bool    `json:"monitoringEnabled"`
	WorkspaceID       *int    `json:"workspaceId"`
}

type devicePingResult struct {
	ID        int     `json:"id"`
	Name      string  `json:"name"`
	IP        string  `json:"ip"`
	LatencyMs int64   `json:"latencyMs"`
	Loss      float64 `json:"loss"`
	Status    string  `json:"status"`
}
