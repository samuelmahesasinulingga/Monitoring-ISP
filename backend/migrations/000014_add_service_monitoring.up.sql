-- Migration to add service monitoring
ALTER TABLE services
ADD COLUMN IF NOT EXISTS monitoring_ip VARCHAR(255),
ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS service_ping_logs (
    id SERIAL PRIMARY KEY,
    service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    latency_ms INT NOT NULL,
    status VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_service_ping_logs_service_id_created_at ON service_ping_logs(service_id, created_at);
