-- Reverse NOT NULL constraints
ALTER TABLE workspaces ALTER COLUMN billing_issue_minute DROP NOT NULL;
ALTER TABLE workspaces ALTER COLUMN netflow_monitoring_mode DROP NOT NULL;
ALTER TABLE workspaces ALTER COLUMN netflow_snapshot_interval DROP NOT NULL;
ALTER TABLE workspaces ALTER COLUMN auto_report_enabled DROP NOT NULL;
ALTER TABLE workspaces ALTER COLUMN auto_report_period DROP NOT NULL;
ALTER TABLE workspaces ALTER COLUMN auto_report_time DROP NOT NULL;
