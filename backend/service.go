package main

import "time"

type service struct {
	ID                int       `json:"id"`
	CustomerID        int       `json:"customerId"`
	CustomerName      string    `json:"customerName,omitempty"`
	PlanName          string    `json:"planName"`
	BandwidthMbps     int       `json:"bandwidthMbps"`
	Active            bool      `json:"active"`
	WorkspaceID       *int      `json:"workspaceId,omitempty"`
	MonitoringIP      *string   `json:"monitoringIp,omitempty"`
	MonitoringEnabled bool      `json:"monitoringEnabled"`
	CreatedAt         time.Time `json:"created_at"`
}
