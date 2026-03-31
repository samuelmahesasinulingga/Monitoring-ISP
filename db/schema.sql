-- Reset dan skema awal untuk aplikasi monitoring ISP & billing

DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
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

