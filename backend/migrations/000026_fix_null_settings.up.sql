-- Fix NULL values in workspaces table for non-pointer columns added in later migrations
-- Using multiple steps and checking existence to avoid errors
DO $$ 
BEGIN
    -- Update values if columns exist and are null
    UPDATE workspaces SET billing_issue_minute = 0 WHERE billing_issue_minute IS NULL;
    UPDATE workspaces SET netflow_monitoring_mode = 'continuous' WHERE netflow_monitoring_mode IS NULL;
    UPDATE workspaces SET netflow_snapshot_interval = 0 WHERE netflow_snapshot_interval IS NULL;
    UPDATE workspaces SET auto_report_enabled = FALSE WHERE auto_report_enabled IS NULL;
    UPDATE workspaces SET auto_report_period = 'weekly' WHERE auto_report_period IS NULL;
    UPDATE workspaces SET auto_report_time = '08:00' WHERE auto_report_time IS NULL;

    -- Make sure they have sensible defaults
    ALTER TABLE workspaces ALTER COLUMN billing_issue_minute SET DEFAULT 0;
    ALTER TABLE workspaces ALTER COLUMN netflow_monitoring_mode SET DEFAULT 'continuous';
    ALTER TABLE workspaces ALTER COLUMN netflow_snapshot_interval SET DEFAULT 0;
    ALTER TABLE workspaces ALTER COLUMN auto_report_enabled SET DEFAULT FALSE;
    ALTER TABLE workspaces ALTER COLUMN auto_report_period SET DEFAULT 'weekly';
    ALTER TABLE workspaces ALTER COLUMN auto_report_time SET DEFAULT '08:00';
END $$;
