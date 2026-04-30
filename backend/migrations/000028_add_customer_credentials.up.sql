-- Add account credentials to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password VARCHAR(255);
