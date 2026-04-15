package main

import (
	"crypto/tls"
	"fmt"
	"os"
	"strconv"

	"gopkg.in/gomail.v2"
)

// SendEmail is a utility function to send emails using the configured SMTP server.
func SendEmail(to string, subject string, htmlBody string) error {
	// 1. Get configuration from Environment Variables
	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")

	if host == "" || portStr == "" || user == "" || pass == "" || from == "" {
		return fmt.Errorf("SMTP configuration is incomplete. Please check your .env file")
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return fmt.Errorf("invalid SMTP_PORT: %v", err)
	}

	// 2. Prepare the email message
	m := gomail.NewMessage()
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", htmlBody)

	// 3. Configure the Dialer (SMTP Connection)
	d := gomail.NewDialer(host, port, user, pass)

	// Optional: Ignore certificate issues (might be needed for some specific setups, but generally true)
	d.TLSConfig = &tls.Config{InsecureSkipVerify: false, ServerName: host}

	// 4. Send the Email
	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}
