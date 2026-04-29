ALTER TABLE customers
  DROP COLUMN IF EXISTS device_id,
  DROP COLUMN IF EXISTS queue_name,
  DROP COLUMN IF EXISTS monthly_price;
