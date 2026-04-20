-- Flow Logs Table for Raw Data (Retention: 7-14 days)
CREATE TABLE IF NOT EXISTS flow_logs (
    id BIGSERIAL PRIMARY KEY,
    workspace_id INT NOT NULL,
    src_ip INET NOT NULL,
    dst_ip INET NOT NULL,
    protocol INT NOT NULL, -- IANA Protocol Number (6=TCP, 17=UDP, etc)
    src_port INT,
    dst_port INT,
    bytes BIGINT NOT NULL DEFAULT 0,
    packets INT NOT NULL DEFAULT 1,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimize for time-series queries
CREATE INDEX IF NOT EXISTS idx_flow_logs_workspace_captured ON flow_logs (workspace_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_logs_src_ip ON flow_logs (src_ip);
CREATE INDEX IF NOT EXISTS idx_flow_logs_dst_ip ON flow_logs (dst_ip);

-- Flow Daily Summary for long-term analytics and fast dashboard rendering
CREATE TABLE IF NOT EXISTS flow_daily_summaries (
    id SERIAL PRIMARY KEY,
    workspace_id INT NOT NULL,
    summary_date DATE NOT NULL,
    src_ip INET NOT NULL,
    protocol INT NOT NULL,
    total_bytes BIGINT DEFAULT 0,
    total_packets BIGINT DEFAULT 0,
    UNIQUE(workspace_id, summary_date, src_ip, protocol)
);

CREATE INDEX IF NOT EXISTS idx_flow_summary_workspace_date ON flow_daily_summaries (workspace_id, summary_date DESC);

-- Helper to automatically cleanup old logs (Optional, can be done via worker)
-- For now, we will use a manual/worker cleanup logic to avoid DB overhead.
