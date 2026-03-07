# ARN - Australian Review Network

Self-hosted media accountability platform.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js + PostgreSQL
- **Auth**: JWT + bcrypt + TOTP 2FA

## Setup

### 1. PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql

CREATE DATABASE arn;
CREATE USER arn_app WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE arn TO arn_app;
\c arn
GRANT ALL ON SCHEMA public TO arn_app;
\q
```

Import schema:
```bash
psql -U arn_app -d arn < schema.sql
```

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env with your database URL and a random JWT secret
npm install
npm run seed-admin -- admin@yourdomain.com yourpassword "Admin Name"
npm start
```

### 3. Frontend

```bash
# In project root
npm install
# Set API URL for production build
VITE_API_URL=https://yourdomain.com/api npm run build
```

The built files will be in `dist/`.

### 4. Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /var/www/arn/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Systemd Service

```ini
# /etc/systemd/system/arn-api.service
[Unit]
Description=ARN API Server
After=postgresql.service

[Service]
WorkingDirectory=/var/www/arn/server
ExecStart=/usr/bin/node index.js
Restart=always
EnvironmentFile=/var/www/arn/server/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now arn-api
```

## Development

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
npm run dev
```

Frontend runs on `http://localhost:8080`, API on `http://localhost:3001`.
