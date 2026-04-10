-- Reset dan skema awal untuk aplikasi monitoring ISP & billing

DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

CREATE TABLE IF NOT EXISTS admins (
	id SERIAL PRIMARY KEY,
	email VARCHAR(255) NOT NULL UNIQUE,
	password VARCHAR(255) NOT NULL,
	role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
	created_at TIMESTAMP DEFAULT NOW()
);

-- Akun default Super Admin
INSERT INTO admins (email, password, role)
VALUES ('admin@isp.co.id', 'admin123', 'super_admin')
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS customers (
	id SERIAL PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	email VARCHAR(255) UNIQUE,
	address TEXT,
	created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
	id SERIAL PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	address TEXT NOT NULL,
	icon_url TEXT,
	telegram_bot_token VARCHAR(255),
	telegram_chat_id VARCHAR(255),
	alert_enabled BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
	id SERIAL PRIMARY KEY,
	full_name VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL UNIQUE,
	whatsapp VARCHAR(50) NOT NULL,
	password VARCHAR(255) NOT NULL,
	role VARCHAR(50) NOT NULL,
	workspace_id INT REFERENCES workspaces(id) ON DELETE SET NULL,
	created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
	id SERIAL PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	ip VARCHAR(255) NOT NULL,
	type VARCHAR(50) NOT NULL,
	integration_mode VARCHAR(20) NOT NULL,
	snmp_version VARCHAR(10),
	snmp_community VARCHAR(255),
	api_user VARCHAR(255),
	api_password VARCHAR(255),
	api_port INT NOT NULL DEFAULT 0,
	monitoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	ping_interval_ms INT NOT NULL DEFAULT 30000,
	workspace_id INT REFERENCES workspaces(id) ON DELETE CASCADE,
	created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_queue_logs (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    queue_name VARCHAR(255) NOT NULL,
    bytes_in BIGINT NOT NULL,
    bytes_out BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_ping_logs (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    latency_ms INT NOT NULL,
    status VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
	id SERIAL PRIMARY KEY,
	customer_id INT NOT NULL REFERENCES customers(id),
	plan_name VARCHAR(255) NOT NULL,
	bandwidth_mbps INT NOT NULL,
	active BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
	id SERIAL PRIMARY KEY,
	service_id INT NOT NULL REFERENCES services(id),
	usage_date DATE NOT NULL,
	download_gb NUMERIC(12,2) NOT NULL,
	upload_gb NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
	id SERIAL PRIMARY KEY,
	customer_id INT NOT NULL REFERENCES customers(id),
	period_start DATE NOT NULL,
	period_end DATE NOT NULL,
	amount NUMERIC(12,2) NOT NULL,
	status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
	created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS device_interface_logs (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    interface_name VARCHAR(255) NOT NULL,
    in_octets BIGINT NOT NULL,
    out_octets BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_alerts (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
