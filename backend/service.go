package main

import "time"

type service struct {
	ID            int       `json:"id"`
	CustomerID    int       `json:"customerId"`
	PlanName      string    `json:"planName"`
	BandwidthMbps int       `json:"bandwidthMbps"`
	Active        bool      `json:"active"`
	WorkspaceID   *int      `json:"workspaceId,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}
