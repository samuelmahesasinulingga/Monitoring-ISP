CREATE TABLE IF NOT EXISTS device_ping_hourly_stats (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL, -- The start of the hour
    min_latency_ms INT NOT NULL,
    max_latency_ms INT NOT NULL,
    avg_latency_ms INT NOT NULL,
    up_count INT NOT NULL,
    total_count INT NOT NULL,
    UNIQUE(device_id, timestamp)
);

-- Index for faster range queries
CREATE INDEX idx_ping_hourly_stats_device_time ON device_ping_hourly_stats(device_id, timestamp);
