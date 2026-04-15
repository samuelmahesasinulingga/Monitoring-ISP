package main

import "time"

type invoice struct {
	ID           int       `json:"id"`
	CustomerID   int       `json:"customerId"`
	CustomerName string    `json:"customerName,omitempty"`
	PeriodStart  string    `json:"periodStart"` // using string for simple YYYY-MM-DD
	PeriodEnd    string    `json:"periodEnd"`
	Amount       float64   `json:"amount"`
	Status       string    `json:"status"` // paid, unpaid
	WorkspaceID  *int      `json:"workspaceId,omitempty"`
	PaymentDate   *time.Time `json:"paymentDate,omitempty"`
	PaymentMethod *string    `json:"paymentMethod,omitempty"`
	Notes         *string    `json:"notes,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}
