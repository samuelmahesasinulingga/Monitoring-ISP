package main

import "time"

type workspace struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	IconURL   *string   `json:"iconUrl,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type createWorkspaceRequest struct {
	Name    string  `json:"name"`
	Address string  `json:"address"`
	IconURL *string `json:"iconUrl,omitempty"`
}
