-- Add NetFlow monitoring configuration to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS netflow_monitoring_mode VARCHAR(20) DEFAULT 'continuous';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS netflow_snapshot_interval INT DEFAULT 0; -- 0 means default/continuous
