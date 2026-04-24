-- Migration for IP Pools
CREATE TABLE IF NOT EXISTS ip_pools (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subnet TEXT NOT NULL,
    gateway TEXT,
    device_id INTEGER,
    vlan INTEGER,
    description TEXT,
    total_ips INTEGER NOT NULL,
    used_ips INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ip_pools_workspace ON ip_pools(workspace_id);
