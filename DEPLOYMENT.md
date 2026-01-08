# Deployment Guide for Hostinger VPS

This guide will help you deploy the Google Maps Places Extractor to your Hostinger VPS server.

## Prerequisites

- Hostinger VPS server with root/SSH access
- Domain name (optional, but recommended)
- Google Maps API key

## Step 1: Server Setup

### Connect to your VPS via SSH
```bash
ssh root@your-server-ip
```

### Update system packages
```bash
apt update && apt upgrade -y
```

### Install Node.js (LTS version)
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### Install Nginx (Web Server/Reverse Proxy)
```bash
apt install -y nginx
```

## Step 2: Transfer Files to Server

### Option A: Using SCP (from your local machine)
```bash
# From your local machine, navigate to project directory
cd /Users/apple/Documents/LeadsExtension

# Transfer files (exclude node_modules)
scp -r * root@your-server-ip:/var/www/leadsextension/
# Or use rsync for better control
rsync -avz --exclude 'node_modules' --exclude '.git' ./ root@your-server-ip:/var/www/leadsextension/
```

### Option B: Using Git (Recommended)
```bash
# On server
cd /var/www
git clone your-repository-url leadsextension
cd leadsextension
```

## Step 3: Install Dependencies

```bash
cd /var/www/leadsextension
npm install --production
```

## Step 4: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add your configuration:
```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
PORT=3000
NODE_ENV=production
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 5: Start Application with PM2

```bash
# Start the application
pm2 start server.js --name "leadsextension"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

### PM2 Useful Commands
```bash
pm2 list              # View running processes
pm2 logs leadsextension  # View logs
pm2 restart leadsextension  # Restart app
pm2 stop leadsextension     # Stop app
pm2 delete leadsextension    # Remove from PM2
```

## Step 6: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/leadsextension
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # If using IP only, use:
    # server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase timeout for large requests
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

Enable the site:
```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/leadsextension /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

## Step 7: Configure Firewall

```bash
# Allow SSH (if not already allowed)
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS (if using SSL)
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

## Step 8: Setup SSL Certificate (Optional but Recommended)

### Using Let's Encrypt (Free SSL)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is set up automatically
# Test renewal
certbot renew --dry-run
```

## Step 9: Verify Deployment

1. Check if PM2 is running:
   ```bash
   pm2 status
   ```

2. Check if Nginx is running:
   ```bash
   systemctl status nginx
   ```

3. Test the application:
   - Visit `http://your-server-ip` or `http://your-domain.com`
   - You should see the Google Maps Places Extractor interface

## Troubleshooting

### Application not starting
```bash
# Check PM2 logs
pm2 logs leadsextension

# Check if port is in use
netstat -tulpn | grep 3000
```

### Nginx 502 Bad Gateway
- Check if the application is running: `pm2 status`
- Check application logs: `pm2 logs leadsextension`
- Verify port in .env matches PM2 process

### Permission Issues
```bash
# Fix ownership if needed
chown -R www-data:www-data /var/www/leadsextension
chmod -R 755 /var/www/leadsextension
```

### View Application Logs
```bash
# PM2 logs
pm2 logs leadsextension

# Nginx error logs
tail -f /var/log/nginx/error.log

# Nginx access logs
tail -f /var/log/nginx/access.log
```

## Maintenance

### Update Application
```bash
cd /var/www/leadsextension
git pull  # If using Git
# Or transfer new files via SCP/rsync

npm install --production
pm2 restart leadsextension
```

### Backup
```bash
# Backup application files
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/leadsextension

# Backup .env file separately (contains sensitive data)
cp .env .env.backup
```

## Security Recommendations

1. **Change default SSH port** (optional but recommended)
2. **Use SSH keys instead of passwords**
3. **Keep system updated**: `apt update && apt upgrade`
4. **Regular backups**
5. **Monitor logs** for suspicious activity
6. **Use strong passwords** for all accounts
7. **Restrict API key** in Google Cloud Console to your server IP

## Performance Optimization

1. **Enable Nginx caching** (add to nginx config):
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 60m;
    # ... rest of proxy settings
}
```

2. **PM2 Cluster Mode** (for better performance):
```bash
pm2 delete leadsextension
pm2 start server.js -i max --name "leadsextension"
```

## Support

For issues specific to:
- **Hostinger VPS**: Contact Hostinger support
- **Application**: Check PM2 logs and application logs
- **Nginx**: Check Nginx error logs

