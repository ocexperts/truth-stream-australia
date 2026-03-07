#!/bin/bash
# ARN - Australian Review Network
# One-script setup for Debian/Ubuntu VM
set -e

echo "=== ARN Setup Script ==="

# --- Config (edit these) ---
DB_PASSWORD="$(openssl rand -hex 16)"
JWT_SECRET="$(openssl rand -hex 32)"
ADMIN_EMAIL="admin@arn.net.au"
ADMIN_PASSWORD="changeme123"
ADMIN_NAME="Admin"
DOMAIN="localhost"  # Change to your domain for production
APP_DIR="/var/www/arn"

echo ""
echo "Database password: $DB_PASSWORD"
echo "JWT secret: $JWT_SECRET"
echo "(Save these somewhere safe)"
echo ""

# --- 1. Install dependencies ---
echo "=== Installing system packages ==="
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib nginx nodejs npm curl

# Install Node 20+ if system version is old
NODE_MAJOR=$(node -v 2>/dev/null | cut -d. -f1 | tr -d v || echo "0")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "=== Installing Node.js 20 ==="
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# --- 2. Setup PostgreSQL ---
echo "=== Setting up PostgreSQL ==="
sudo -u postgres psql -c "CREATE DATABASE arn;" 2>/dev/null || echo "Database 'arn' already exists"
sudo -u postgres psql -c "DO \$\$ BEGIN CREATE USER arn_app WITH PASSWORD '$DB_PASSWORD'; EXCEPTION WHEN duplicate_object THEN ALTER USER arn_app WITH PASSWORD '$DB_PASSWORD'; END \$\$;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE arn TO arn_app;"
sudo -u postgres psql -d arn -c "GRANT ALL ON SCHEMA public TO arn_app;"

# --- 3. Import schema ---
echo "=== Importing database schema ==="
sudo -u postgres psql -d arn < "$APP_DIR/schema.sql" 2>/dev/null || echo "Schema may already exist (OK)"
# Grant table permissions after schema import
sudo -u postgres psql -d arn -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO arn_app;"
sudo -u postgres psql -d arn -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO arn_app;"
sudo -u postgres psql -d arn -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO arn_app;"

# --- 4. Setup backend ---
echo "=== Setting up backend ==="
cd "$APP_DIR/server"

cat > .env <<EOF
DATABASE_URL=postgres://arn_app:${DB_PASSWORD}@localhost:5432/arn
JWT_SECRET=${JWT_SECRET}
PORT=3001
FRONTEND_URL=http://${DOMAIN}
EOF

npm install

# Seed admin user
node seed-admin.js "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$ADMIN_NAME"
echo "Admin user created: $ADMIN_EMAIL / $ADMIN_PASSWORD"

# --- 5. Build frontend ---
echo "=== Building frontend ==="
cd "$APP_DIR"
npm install

if [ "$DOMAIN" = "localhost" ]; then
  VITE_API_URL="http://localhost/api" npm run build
else
  VITE_API_URL="https://${DOMAIN}/api" npm run build
fi

# --- 6. Setup Nginx ---
echo "=== Configuring Nginx ==="
sudo tee /etc/nginx/sites-available/arn > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend
    location / {
        root ${APP_DIR}/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/arn /etc/nginx/sites-enabled/arn
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# --- 7. Setup systemd service ---
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
echo "  Change DOMAIN in this script and re-run"
echo "  for production. Add SSL with:"
echo "    sudo apt install certbot python3-certbot-nginx"
echo "    sudo certbot --nginx -d yourdomain.com"
echo "========================================="
