#!/bin/bash
# SSL Certificate Setup for Mwalimu School Management System
# Automated Let's Encrypt certificate generation and renewal

set -e

# Configuration
DOMAIN="yourschool.com"
STAGING_DOMAIN="staging.yourschool.com"
EMAIL="admin@yourschool.com"
WEBROOT="/var/www/certbot"
CERT_DIR="/etc/letsencrypt/live"
NGINX_CONF="/etc/nginx/nginx.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    log "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Create webroot directory
mkdir -p "$WEBROOT"
chown -R nginx:nginx "$WEBROOT"

# Function to obtain SSL certificate
obtain_certificate() {
    local domain=$1
    local test_mode=$2
    
    log "Obtaining SSL certificate for $domain..."
    
    # Test mode flag
    local test_flag=""
    if [[ "$test_mode" == "true" ]]; then
        test_flag="--test-cert"
        warn "Running in test mode (staging certificates)"
    fi
    
    # Check if certificate already exists
    if [[ -d "$CERT_DIR/$domain" ]]; then
        log "Certificate for $domain already exists. Use renew option to update."
        return 0
    fi
    
    # Obtain certificate
    certbot certonly \
        --webroot \
        --webroot-path="$WEBROOT" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$domain,www.$domain" \
        --non-interactive \
        $test_flag
    
    if [[ $? -eq 0 ]]; then
        log "Successfully obtained certificate for $domain"
    else
        error "Failed to obtain certificate for $domain"
    fi
}

# Function to renew certificates
renew_certificates() {
    log "Renewing SSL certificates..."
    
    certbot renew --quiet --nginx
    
    if [[ $? -eq 0 ]]; then
        log "Certificate renewal completed successfully"
        
        # Test nginx configuration
        nginx -t
        if [[ $? -eq 0 ]]; then
            log "Reloading Nginx configuration..."
            systemctl reload nginx
        else
            error "Nginx configuration test failed"
        fi
    else
        error "Certificate renewal failed"
    fi
}

# Function to check certificate expiration
check_expiration() {
    log "Checking certificate expiration..."
    
    for domain in "$DOMAIN" "$STAGING_DOMAIN"; do
        if [[ -f "$CERT_DIR/$domain/cert.pem" ]]; then
            local exp_date=$(openssl x509 -enddate -noout -in "$CERT_DIR/$domain/cert.pem" | cut -d= -f2)
            local exp_timestamp=$(date -d "$exp_date" +%s)
            local current_timestamp=$(date +%s)
            local days_left=$(( (exp_timestamp - current_timestamp) / 86400 ))
            
            if [[ $days_left -lt 30 ]]; then
                warn "Certificate for $domain expires in $days_left days"
            else
                log "Certificate for $domain is valid for $days_left more days"
            fi
        else
            warn "No certificate found for $domain"
        fi
    done
}

# Function to setup auto-renewal cron job
setup_cron() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/certbot-renew.sh << 'EOF'
#!/bin/bash
# Automated certificate renewal script

LOG_FILE="/var/log/certbot-renewal.log"

{
    echo "=== Certificate Renewal - $(date) ==="
    
    # Renew certificates
    /usr/bin/certbot renew --quiet --nginx
    
    # Check renewal status
    if [ $? -eq 0 ]; then
        echo "✓ Certificate renewal successful"
        
        # Reload nginx if needed
        /usr/bin/nginx -t && /bin/systemctl reload nginx
        
        if [ $? -eq 0 ]; then
            echo "✓ Nginx reloaded successfully"
        else
            echo "✗ Failed to reload Nginx"
        fi
    else
        echo "✗ Certificate renewal failed"
    fi
    
    echo "=== End Renewal - $(date) ==="
    echo
} >> "$LOG_FILE" 2>&1
EOF

    chmod +x /usr/local/bin/certbot-renew.sh
    
    # Add cron job (runs twice daily)
    (crontab -l 2>/dev/null; echo "0 2,14 * * * /usr/local/bin/certbot-renew.sh") | crontab -
    
    log "Auto-renewal cron job configured to run twice daily"
}

# Function to generate strong DH parameters
generate_dhparam() {
    local dhparam_file="/etc/ssl/certs/dhparam.pem"
    
    if [[ ! -f "$dhparam_file" ]]; then
        log "Generating strong DH parameters (this may take a while)..."
        openssl dhparam -out "$dhparam_file" 2048
        log "DH parameters generated"
    else
        log "DH parameters already exist"
    fi
}

# Function to create initial nginx configuration for certificate generation
create_initial_nginx_config() {
    log "Creating initial Nginx configuration for certificate generation..."
    
    cat > /etc/nginx/sites-available/default << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN $STAGING_DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }
    
    location / {
        return 444;
    }
}
EOF

    # Enable the configuration
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    nginx -t && systemctl reload nginx
}

# Main script logic
case "${1:-}" in
    "production")
        log "Setting up SSL certificates for production..."
        create_initial_nginx_config
        obtain_certificate "$DOMAIN" "false"
        obtain_certificate "$STAGING_DOMAIN" "false"
        generate_dhparam
        setup_cron
        log "Production SSL setup completed!"
        ;;
    "staging")
        log "Setting up SSL certificates for staging/testing..."
        create_initial_nginx_config
        obtain_certificate "$DOMAIN" "true"
        obtain_certificate "$STAGING_DOMAIN" "true"
        generate_dhparam
        log "Staging SSL setup completed!"
        ;;
    "renew")
        renew_certificates
        ;;
    "check")
        check_expiration
        ;;
    "cron")
        setup_cron
        ;;
    *)
        echo "Usage: $0 {production|staging|renew|check|cron}"
        echo
        echo "Commands:"
        echo "  production  - Obtain production SSL certificates"
        echo "  staging     - Obtain staging SSL certificates (test mode)"
        echo "  renew       - Renew existing certificates"
        echo "  check       - Check certificate expiration dates"
        echo "  cron        - Set up automatic renewal cron job"
        echo
        echo "Examples:"
        echo "  $0 production    # Initial production setup"
        echo "  $0 staging       # Test setup with staging certificates"
        echo "  $0 renew         # Manual renewal"
        echo "  $0 check         # Check expiration dates"
        exit 1
        ;;
esac

log "SSL management script completed successfully!"