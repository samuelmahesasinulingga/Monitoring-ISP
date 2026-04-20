-- Add agent_ip to flow_logs
ALTER TABLE flow_logs ADD COLUMN agent_ip INET;

-- Add index for filtering by agent
CREATE INDEX idx_flow_logs_workspace_agent ON flow_logs (workspace_id, agent_ip);
