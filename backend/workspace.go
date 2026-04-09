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
}
