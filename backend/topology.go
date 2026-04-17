package main

import "time"

type TopologyNode struct {
	ID          string    `json:"id"`
	WorkspaceID int       `json:"workspaceId"`
	LayoutID    int       `json:"layoutId"`
	DeviceID    *int      `json:"deviceId"`
	Type        string    `json:"type"`
	Label       string    `json:"label"`
	X           float64   `json:"x"`
	Y           float64   `json:"y"`
	CreatedAt   time.Time `json:"createdAt"`
}

type TopologyEdge struct {
	ID          string    `json:"id"`
	WorkspaceID int       `json:"workspaceId"`
	LayoutID    int       `json:"layoutId"`
	Source      string    `json:"source"`
	Target      string    `json:"target"`
	Label       string    `json:"label"`
	CreatedAt   time.Time `json:"createdAt"`
}

type TopologyData struct {
	Nodes []TopologyNode `json:"nodes"`
	Edges []TopologyEdge `json:"edges"`
}

type TopologyLayout struct {
    ID          int       `json:"id"`
    WorkspaceID int       `json:"workspaceId"`
    Name        string    `json:"name"`
    CreatedAt   time.Time `json:"createdAt"`
}

