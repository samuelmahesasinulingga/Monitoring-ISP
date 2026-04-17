-- Comprehensive Fix for NULL values in non-pointer columns
-- Workspaces
UPDATE workspaces SET alert_enabled = FALSE WHERE alert_enabled IS NULL;
UPDATE workspaces SET auto_billing_enabled = FALSE WHERE auto_billing_enabled IS NULL;
UPDATE workspaces SET billing_issue_day = 1 WHERE billing_issue_day IS NULL;
UPDATE workspaces SET billing_issue_hour = 0 WHERE billing_issue_hour IS NULL;
UPDATE workspaces SET last_billing_run_month = 0 WHERE last_billing_run_month IS NULL;

-- Devices
UPDATE devices SET api_port = 0 WHERE api_port IS NULL;
UPDATE devices SET monitoring_enabled = TRUE WHERE monitoring_enabled IS NULL;
UPDATE devices SET ping_interval_ms = 30000 WHERE ping_interval_ms IS NULL;

-- Invoices
UPDATE invoices SET is_sent = FALSE WHERE is_sent IS NULL;
UPDATE invoices SET status = 'unpaid' WHERE status IS NULL;
UPDATE invoices SET amount = 0 WHERE amount IS NULL;

-- Services
UPDATE services SET active = TRUE WHERE active IS NULL;
UPDATE services SET bandwidth_mbps = 0 WHERE bandwidth_mbps IS NULL;

-- Packages
UPDATE packages SET bandwidth_mbps = 0 WHERE bandwidth_mbps IS NULL;
UPDATE packages SET price = 0 WHERE price IS NULL;
