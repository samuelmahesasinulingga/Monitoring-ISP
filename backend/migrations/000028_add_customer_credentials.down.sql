-- Remove account credentials from customers table
ALTER TABLE customers DROP COLUMN IF NOT EXISTS username;
ALTER TABLE customers DROP COLUMN IF NOT EXISTS password;
