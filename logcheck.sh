#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
CHECK_MARK="\xE2\x9C\x94"
CROSS_MARK="\xE2\x9C\x98"

# Add timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo -e "${YELLOW}Started check at: $TIMESTAMP${NC}"

# Helper functions
print_status() {
    if [ "$2" = "true" ]; then
        echo -e "${GREEN}${CHECK_MARK} $1${NC}"
    else
        echo -e "${RED}${CROSS_MARK} $1${NC}"
    fi
}

print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
    echo "----------------------------------------"
}

check_port() {
    nc -z localhost $1 > /dev/null 2>&1
    return $?
}

print_header "Strava TCX Converter System Check"

# Check build files
print_header "1. Build Files"
if [ -d "/var/www/strava-tcx-converter" ]; then
    print_status "Web directory exists" true
    ls -la /var/www/strava-tcx-converter
else
    print_status "Web directory missing" false
fi

# Check Nginx
print_header "2. Nginx Status"
if systemctl is-active --quiet nginx; then
    print_status "Nginx service" true
    # Check if port 80 and 443 are listening
    if check_port 80 && check_port 443; then
        print_status "Ports 80 and 443 are open" true
    else
        print_status "Port check failed" false
    fi
else
    print_status "Nginx service" false
fi

echo "Nginx configuration test:"
sudo nginx -t
echo "Recent Nginx errors (last 24h):"
sudo find /var/log/nginx/error.log -mtime -1 -type f -exec tail -n 5 {} \;

# Check PM2 process
print_header "3. PM2 Process"
if pm2 list | grep -q "strava-tcx-converter.*online"; then
    print_status "PM2 process" true
    # Check memory usage with improved error handling
    MEM_USAGE=$(pm2 show strava-tcx-converter | grep "memory" | awk '{print $4}')
    if [ -n "$MEM_USAGE" ]; then
        if [[ "${MEM_USAGE%.*}" -lt 150 ]]; then
            print_status "Memory usage: $MEM_USAGE" true
        else
            print_status "Memory usage: $MEM_USAGE (High)" false
        fi
    else
        print_status "Memory usage: Unable to determine" false
    fi
else
    print_status "PM2 process" false
fi

# Check MongoDB with improved database checks
print_header "4. MongoDB Status"
if systemctl is-active --quiet mongod; then
    print_status "MongoDB service" true
    # Check MongoDB connection
    if mongosh --eval "db.adminCommand('ping')" --quiet; then
        print_status "MongoDB connection" true
        echo "Database Statistics:"
        mongosh strava-tcx-converter --eval "db.stats()" --quiet
        COLLECTIONS=$(mongosh strava-tcx-converter --eval "db.getCollectionNames()" --quiet)
        print_status "Collections found: $COLLECTIONS" true
    else
        print_status "MongoDB connection failed" false
    fi
else
    print_status "MongoDB service" false
fi

# Check file permissions
print_header "5. File Permissions"
WEB_DIR="/var/www/strava-tcx-converter"
CORRECT_PERMS=755
CORRECT_OWNER="www-data:www-data"

ACTUAL_PERMS=$(stat -c "%a" $WEB_DIR)
ACTUAL_OWNER=$(stat -c "%U:%G" $WEB_DIR)

if [ "$ACTUAL_PERMS" = "$CORRECT_PERMS" ]; then
    print_status "Permissions ($ACTUAL_PERMS)" true
else
    print_status "Permissions ($ACTUAL_PERMS should be $CORRECT_PERMS)" false
fi

if [ "$ACTUAL_OWNER" = "$CORRECT_OWNER" ]; then
    print_status "Owner ($ACTUAL_OWNER)" true
else
    print_status "Owner ($ACTUAL_OWNER should be $CORRECT_OWNER)" false
fi

# Check server logs
print_header "6. Recent Server Logs"
echo "PM2 error logs (last 5 lines):"
tail -n 5 ~/.pm2/logs/strava-tcx-converter-error.log 2>/dev/null || echo "No error logs found"
echo
echo "PM2 output logs (last 5 lines):"
tail -n 5 ~/.pm2/logs/strava-tcx-converter-out.log 2>/dev/null || echo "No output logs found"

# Check SSL certificates
print_header "7. SSL Certificates"
CERT_PATH="/etc/letsencrypt/live/s2g.sunfishsystems.com/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
    print_status "SSL certificate exists" true
    # Check expiration
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
    
    if [ $DAYS_LEFT -gt 30 ]; then
        print_status "Certificate expires in $DAYS_LEFT days" true
    else
        print_status "Certificate expires in $DAYS_LEFT days" false
    fi
else
    print_status "SSL certificate missing" false
fi

# Check disk space
print_header "8. Disk Space"
DISK_USAGE=$(df -h / | tail -n 1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_status "Disk usage: $DISK_USAGE%" true
else
    print_status "Disk usage: $DISK_USAGE% (Warning: High)" false
fi

print_header "System Status Summary"
echo -n "Nginx: "
if systemctl is-active --quiet nginx; then echo -e "${GREEN}✅ Running${NC}"; else echo -e "${RED}❌ Not running${NC}"; fi

echo -n "PM2: "
if pm2 list | grep -q "strava-tcx-converter.*online"; then echo -e "${GREEN}✅ Running${NC}"; else echo -e "${RED}❌ Not running${NC}"; fi

echo -n "MongoDB: "
if systemctl is-active --quiet mongod; then echo -e "${GREEN}✅ Running${NC}"; else echo -e "${RED}❌ Not running${NC}"; fi

echo -n "SSL Certificate: "
if [ -f "/etc/letsencrypt/live/s2g.sunfishsystems.com/fullchain.pem" ]; then 
    echo -e "${GREEN}✅ Valid${NC}"
else 
    echo -e "${RED}❌ Missing${NC}"
fi

echo -n "Build Files: "
if [ -f "/var/www/strava-tcx-converter/index.html" ]; then 
    echo -e "${GREEN}✅ Present${NC}"
else 
    echo -e "${RED}❌ Missing${NC}"
fi

echo "----------------------------------------" 