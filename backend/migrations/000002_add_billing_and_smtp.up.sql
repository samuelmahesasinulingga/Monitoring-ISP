-- Workspaces extensions for Auto Billing & SMTP
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS auto_billing_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS billing_issue_day INT DEFAULT 1;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS billing_issue_hour INT DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS last_billing_run_month INT DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS smtp_provider VARCHAR(255);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS smtp_port INT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS smtp_use_tls BOOLEAN DEFAULT TRUE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS smtp_pass VARCHAR(255);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(255);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS smtp_from_email VARCHAR(255);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS invoice_subject_template TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS invoice_body_template TEXT;

-- Invoices extensions for detailed records
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT FALSE;
