CREATE TABLE security_alerts (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    alert_type VARCHAR(50), -- 'DDoS', 'Port Scan'
    source_ip VARCHAR(50),
    destination_ip VARCHAR(50),
    severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    description TEXT,
    metric_value FLOAT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_alerts_workspace ON security_alerts(workspace_id);
CREATE INDEX idx_security_alerts_created ON security_alerts(created_at);
