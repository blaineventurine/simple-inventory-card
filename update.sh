#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

REMOTE_HOST="boognish"
REMOTE_BASE_PATH="/home/blaine/docker-containers/homeassistant/www/community/simple-inventory-card"
LOCAL_BASE_PATH="${HOME}/repos/simple-inventory-card/dist"

npm run build

echo -e "${BLUE}🚀 Deploying Simple Inventory to Home Assistant...${NC}"
echo -e "${GREEN}📁 Ensuring remote directories exist...${NC}"
ssh "$REMOTE_HOST" "mkdir -p ${REMOTE_BASE_PATH}"
echo -e "${GREEN}🔧 Copying backend integration files...${NC}"
scp "$LOCAL_BASE_PATH"/* "$REMOTE_HOST:$REMOTE_BASE_PATH"

echo -e "${BLUE}🎉 All done! Your Simple Inventory integration should be updated.${NC}"
