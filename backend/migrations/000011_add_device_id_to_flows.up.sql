-- Add device_id to flow logs for persistent identification
ALTER TABLE flow_logs ADD COLUMN device_id INT REFERENCES devices(id) ON DELETE SET NULL;
ALTER TABLE flow_daily_summaries ADD COLUMN device_id INT REFERENCES devices(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_flow_logs_device_id ON flow_logs (device_id);
CREATE INDEX idx_flow_summary_device_id ON flow_daily_summaries (device_id);

-- Try to populate existing logs based on agent_ip
UPDATE flow_logs fl
SET device_id = d.id
FROM devices d
WHERE fl.agent_ip::text = d.ip AND fl.workspace_id = d.workspace_id;

UPDATE flow_daily_summaries fds
SET device_id = d.id
FROM devices d
WHERE fds.src_ip::text = d.ip AND fds.workspace_id = d.workspace_id;
