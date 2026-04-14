package main

import "time"

type packageData struct {
	ID            int       `json:"id"`
	Name          string    `json:"name"`
	BandwidthMbps int       `json:"bandwidthMbps"`
	Price         float64   `json:"price"`
	WorkspaceID   *int      `json:"workspaceId,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}
