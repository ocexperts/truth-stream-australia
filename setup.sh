#!/bin/bash
# ARN - Australian Review Network
# One-script setup for Debian/Ubuntu VM
set -e

echo "=== ARN Setup Script ==="

# --- Config ---
DB_PASSWORD="$(openssl rand -hex 16)"
JWT_SECRET="$(openssl rand -hex 32)"
ADMIN_EMAIL="admin@arn.net.au"
ADMIN_PASSWORD="changeme123"
ADMIN_NAME="Admin"
DOMAIN="localhost"
APP_DIR="/var/www/arn"

echo ""
echo "Database password: $DB_PASSWORD"
echo "JWT secret:        $JWT_SECRET"
echo "(Save these somewhere safe)"
echo ""

# --- 1. Install dependencies ---
echo "=== Installing system packages ==="
sudo apt-get update -qq
sudo apt-get install -y postgresql postgresql-contrib nginx curl

# Install Node.js 20 from nodesource
NODE_MAJOR=$(node -v 2>/dev/null | cut -d. -f1 | tr -d v || echo "0")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "=== Installing Node.js 20 ==="
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# --- 2. Setup PostgreSQL ---
echo "=== Setting up PostgreSQL ==="

# Ensure PostgreSQL is running
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user using heredoc to avoid escaping issues
sudo -u postgres psql <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'arn_app') THEN
    CREATE ROLE arn_app WITH LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE arn_app WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE arn OWNER arn_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'arn')\gexec

GRANT ALL PRIVILEGES ON DATABASE arn TO arn_app;
EOSQL

# Import schema as postgres (owner), then grant to arn_app
sudo -u postgres psql -d arn < "$APP_DIR/schema.sql" 2>/dev/null || echo "Schema may already exist (OK)"
sudo -u postgres psql -d arn <<EOSQL
GRANT ALL ON SCHEMA public TO arn_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO arn_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO arn_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO arn_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO arn_app;
EOSQL

# Ensure pg_hba.conf allows password auth for local connections
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | xargs)
if ! grep -q "arn_app" "$PG_HBA" 2>/dev/null; then
  # Add md5 auth rule for arn_app before any existing local rules
  sudo sed -i "/^local.*all.*all/i local   arn   arn_app   md5" "$PG_HBA"
  sudo sed -i "/^host.*all.*all.*127/i host   arn   arn_app   127.0.0.1/32   md5" "$PG_HBA"
  sudo systemctl reload postgresql
  echo "Added password auth for arn_app in pg_hba.conf"
fi

# --- 3. Setup backend ---
echo "=== Setting up backend ==="
cd "$APP_DIR/server"

cat > .env <<EOF
DATABASE_URL=postgres://arn_app:${DB_PASSWORD}@127.0.0.1:5432/arn
JWT_SECRET=${JWT_SECRET}
PORT=3001
FRONTEND_URL=http://${DOMAIN}
EOF

npm install

# Test DB connection before seeding
echo "Testing database connection..."
node -e "
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || '$(grep DATABASE_URL .env | cut -d= -f2-)' });
pool.query('SELECT 1').then(() => { console.log('DB connection OK'); pool.end(); }).catch(e => { console.error('DB connection FAILED:', e.message); process.exit(1); });
" && echo "Connection verified" || {
  echo "ERROR: Cannot connect to database. Check pg_hba.conf and password."
  exit 1
}

# Seed admin user
node seed-admin.js "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$ADMIN_NAME"
echo "Admin user created: $ADMIN_EMAIL / $ADMIN_PASSWORD"

# --- 4. Build frontend ---
echo "=== Building frontend ==="
cd "$APP_DIR"
npm install

if [ "$DOMAIN" = "localhost" ]; then
  VITE_API_URL="http://localhost/api" npm run build
else
  VITE_API_URL="https://${DOMAIN}/api" npm run build
fi

# --- 5. Setup Nginx ---
echo "=== Configuring Nginx ==="
sudo tee /etc/nginx/sites-available/arn > /dev/null <<'NGINX'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location / {
        root APPDIR_PLACEHOLDER/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN}|g" /etc/nginx/sites-available/arn
sudo sed -i "s|APPDIR_PLACEHOLDER|${APP_DIR}|g" /etc/nginx/sites-available/arn

sudo ln -sf /etc/nginx/sites-available/arn /etc/nginx/sites-enabled/arn
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# --- 6. Setup systemd service ---
echo "=== Creating systemd service ==="
sudo tee /etc/systemd/system/arn-api.service > /dev/null <<EOF
[Unit]
Description=ARN API Server
After=postgresql.service

[Service]
WorkingDirectory=${APP_DIR}/server
ExecStart=/usr/bin/node index.js
Restart=always
EnvironmentFile=${APP_DIR}/server/.env
User=www-data

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now arn-api

# --- Done ---
echo ""
echo "========================================="
echo "  ARN is now running!"
echo "========================================="
echo ""
echo "  URL:    http://${DOMAIN}"
echo "  Admin:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
echo ""
echo "  For production with SSL:"
echo "    1. Edit DOMAIN in this script"
echo "    2. Re-run the script"
echo "    3. sudo apt install certbot python3-certbot-nginx"
echo "    4. sudo certbot --nginx -d yourdomain.com"
echo "========================================="
