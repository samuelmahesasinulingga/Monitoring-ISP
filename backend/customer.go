package main

import "time"

type customer struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Email        *string   `json:"email,omitempty"`
	Address      *string   `json:"address,omitempty"`
	WorkspaceID  *int      `json:"workspaceId,omitempty"`
	DeviceID     *int      `json:"deviceId,omitempty"`
	QueueName    *string   `json:"queueName,omitempty"`
	MonthlyPrice float64   `json:"monthlyPrice"`
	CreatedAt    time.Time `json:"created_at"`
}
