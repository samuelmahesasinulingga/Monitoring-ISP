-- Network Topology Tables
CREATE TABLE IF NOT EXISTS topology_nodes (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    device_id INT REFERENCES devices(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    label VARCHAR(255),
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topology_edges (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_id VARCHAR(255) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    label VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
