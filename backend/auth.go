package main

import "time"

type admin struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	Email            string  `json:"email"`
	Role             string  `json:"role"`
	WorkspaceID      *int    `json:"workspaceId,omitempty"`
	WorkspaceName    *string `json:"workspaceName,omitempty"`
	WorkspaceAddress *string `json:"workspaceAddress,omitempty"`
}
