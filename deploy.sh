#!/bin/bash

# Deployment script for Hostinger VPS
# Usage: ./deploy.sh user@server-ip

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Server address required${NC}"
    echo "Usage: ./deploy.sh user@server-ip"
    exit 1
fi

SERVER=$1
APP_DIR="/var/www/leadsextension"

echo -e "${GREEN}Starting deployment to $SERVER...${NC}"

# Step 1: Transfer files
echo -e "${YELLOW}Step 1: Transferring files...${NC}"
rsync -avz --exclude 'node_modules' \
           --exclude '.git' \
           --exclude '.env' \
           --exclude '*.log' \
           --exclude 'backup*' \
           ./ $SERVER:$APP_DIR/

# Step 2: Install dependencies
echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
ssh $SERVER "cd $APP_DIR && npm install --production"

# Step 3: Restart application
echo -e "${YELLOW}Step 3: Restarting application...${NC}"
ssh $SERVER "cd $APP_DIR && pm2 restart leadsextension || pm2 start server.js --name leadsextension"

# Step 4: Save PM2 configuration
echo -e "${YELLOW}Step 4: Saving PM2 configuration...${NC}"
ssh $SERVER "pm2 save"

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${YELLOW}Check application status: ssh $SERVER 'pm2 status'${NC}"

