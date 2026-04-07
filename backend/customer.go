package main

import "time"

type customer struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     *string   `json:"email,omitempty"`
	Address   *string   `json:"address,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
