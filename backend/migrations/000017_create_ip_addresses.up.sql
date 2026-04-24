CREATE TABLE IF NOT EXISTS ip_addresses (
    id SERIAL PRIMARY KEY,
    pool_id INT NOT NULL REFERENCES ip_pools(id) ON DELETE CASCADE,
    ip_address VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available', -- available, assigned, reserved, network, broadcast
    device_name VARCHAR(255),
    device_type VARCHAR(255),
    mac_address VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pool_id, ip_address)
);

-- Trigger to update used_ips in ip_pools when an IP is added/removed/updated
CREATE OR REPLACE FUNCTION update_pool_used_ips()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status != 'available') THEN
            UPDATE ip_pools SET used_ips = used_ips + 1 WHERE id = NEW.pool_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status = 'available' AND NEW.status != 'available') THEN
            UPDATE ip_pools SET used_ips = used_ips + 1 WHERE id = NEW.pool_id;
        ELSIF (OLD.status != 'available' AND NEW.status = 'available') THEN
            UPDATE ip_pools SET used_ips = used_ips - 1 WHERE id = NEW.pool_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.status != 'available') THEN
            UPDATE ip_pools SET used_ips = used_ips - 1 WHERE id = OLD.pool_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pool_used_ips
AFTER INSERT OR UPDATE OR DELETE ON ip_addresses
FOR EACH ROW EXECUTE FUNCTION update_pool_used_ips();
