-- Insert a default workspace if none exists
INSERT INTO workspaces (id, name, address)
SELECT 1, 'Main Workspace', 'Your ISP Address'
WHERE NOT EXISTS (SELECT 1 FROM workspaces WHERE id = 1);

-- Update the serial sequence for workspaces
SELECT setval(pg_get_serial_sequence('workspaces', 'id'), COALESCE(MAX(id), 1)) FROM workspaces;
