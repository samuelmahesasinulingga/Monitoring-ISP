package main

import "time"

type workspace struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	IconURL          *string   `json:"iconUrl,omitempty"`
	TelegramBotToken *string   `json:"telegramBotToken,omitempty"`
	TelegramChatID   *string   `json:"telegramChatId,omitempty"`
	AlertEnabled     bool      `json:"alertEnabled"`
	AutoBillingEnabled bool    `json:"autoBillingEnabled"`
	BillingIssueDay    int     `json:"billingIssueDay"`
	LastBillingRunMonth int    `json:"lastBillingRunMonth"`
	
	// SMTP Settings
	SmtpProvider          *string `json:"smtpProvider,omitempty"`
	SmtpHost              *string `json:"smtpHost,omitempty"`
	SmtpPort              *int    `json:"smtpPort,omitempty"`
	SmtpUseTls            *bool   `json:"smtpUseTls,omitempty"`
	SmtpUser              *string `json:"smtpUser,omitempty"`
	SmtpPass              *string `json:"smtpPass,omitempty"` // For security, might be better not to always send to frontend, but we'll do it for simplicity here.
	SmtpFromName          *string `json:"smtpFromName,omitempty"`
	SmtpFromEmail         *string `json:"smtpFromEmail,omitempty"`
	InvoiceSubjectTemplate *string `json:"invoiceSubjectTemplate,omitempty"`
	InvoiceBodyTemplate    *string `json:"invoiceBodyTemplate,omitempty"`
	
	CreatedAt        time.Time `json:"created_at"`
}

type createWorkspaceRequest struct {
	Name    string  `json:"name"`
	Address string  `json:"address"`
	IconURL *string `json:"iconUrl,omitempty"`
}

type updateWorkspaceSettingsRequest struct {
	TelegramBotToken *string `json:"telegramBotToken"`
	TelegramChatID   *string `json:"telegramChatId"`
	AlertEnabled     bool    `json:"alertEnabled"`
	AutoBillingEnabled bool  `json:"autoBillingEnabled"`
	BillingIssueDay    int   `json:"billingIssueDay"`
}

type updateWorkspaceSmtpRequest struct {
	SmtpProvider          *string `json:"smtpProvider,omitempty"`
	SmtpHost              *string `json:"smtpHost,omitempty"`
	SmtpPort              *int    `json:"smtpPort,omitempty"`
	SmtpUseTls            *bool   `json:"smtpUseTls,omitempty"`
	SmtpUser              *string `json:"smtpUser,omitempty"`
	SmtpPass              *string `json:"smtpPass,omitempty"`
	SmtpFromName          *string `json:"smtpFromName,omitempty"`
	SmtpFromEmail         *string `json:"smtpFromEmail,omitempty"`
	InvoiceSubjectTemplate *string `json:"invoiceSubjectTemplate,omitempty"`
	InvoiceBodyTemplate    *string `json:"invoiceBodyTemplate,omitempty"`
}
