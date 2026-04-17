CREATE TABLE IF NOT EXISTS topology_layouts (
    id SERIAL PRIMARY KEY,
    workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 1. Create a default layout for any workspace that has nodes
INSERT INTO topology_layouts (workspace_id, name)
SELECT DISTINCT workspace_id, 'Default Layout'
FROM topology_nodes 
ON CONFLICT DO NOTHING;

-- 2. Add layout_id column to nodes and edges
ALTER TABLE topology_nodes ADD COLUMN IF NOT EXISTS layout_id INT REFERENCES topology_layouts(id) ON DELETE CASCADE;
ALTER TABLE topology_edges ADD COLUMN IF NOT EXISTS layout_id INT REFERENCES topology_layouts(id) ON DELETE CASCADE;

-- 3. Update existing nodes to point to the newly created Default Layout
UPDATE topology_nodes 
SET layout_id = tl.id 
FROM topology_layouts tl 
WHERE topology_nodes.workspace_id = tl.workspace_id
  AND topology_nodes.layout_id IS NULL;

-- 4. Update existing edges to point to the Default Layout
UPDATE topology_edges 
SET layout_id = tl.id 
FROM topology_layouts tl 
WHERE topology_edges.workspace_id = tl.workspace_id
  AND topology_edges.layout_id IS NULL;

-- 5. By design, we probably shouldn't drop workspace_id to avoid breaking constraints too aggressively, 
-- but let's make sure layout_id is not null moving forward (optional, safe to skip for backward compact).
-- But we can remove the NOT NULL from workspace_id if we want, or just keep storing both. 
-- For simplicity, we'll store both.
