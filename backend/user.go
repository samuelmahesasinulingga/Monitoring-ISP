package main

import "time"

type user struct {
	ID          int       `json:"id"`
	FullName    string    `json:"fullName"`
	Email       string    `json:"email"`
	Whatsapp    string    `json:"whatsapp"`
	Role        string    `json:"role"`
	WorkspaceID *int      `json:"workspaceId"`
	CreatedAt   time.Time `json:"created_at"`
}

type createUserRequest struct {
	FullName    string `json:"fullName"`
	Email       string `json:"email"`
	Whatsapp    string `json:"whatsapp"`
	Password    string `json:"password"`
	Role        string `json:"role"`
	WorkspaceID *int   `json:"workspaceId"`
}
