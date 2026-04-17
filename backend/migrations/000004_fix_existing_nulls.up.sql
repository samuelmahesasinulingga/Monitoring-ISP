-- Fill defaults for existing rows to avoid Scan errors in Go (NULL to non-pointer fields)
UPDATE workspaces SET 
    auto_billing_enabled = FALSE 
WHERE auto_billing_enabled IS NULL;

UPDATE workspaces SET 
    billing_issue_day = 1 
WHERE billing_issue_day IS NULL;

UPDATE workspaces SET 
    billing_issue_hour = 0 
WHERE billing_issue_hour IS NULL;

UPDATE workspaces SET 
    last_billing_run_month = 0 
WHERE last_billing_run_month IS NULL;

-- Fix invoices is_sent column
UPDATE invoices SET 
    is_sent = FALSE 
WHERE is_sent IS NULL;
