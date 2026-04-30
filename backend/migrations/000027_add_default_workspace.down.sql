-- Remove the default workspace if it was added by this migration
-- Note: This is dangerous if data was added to it, so usually we don't delete.
-- But for a down migration it's expected.
DELETE FROM workspaces WHERE id = 1 AND name = 'Main Workspace' AND address = 'Your ISP Address';
