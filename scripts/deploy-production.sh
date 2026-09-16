#!/bin/bash
# Production Deployment Script for Mwalimu School Management System
# Supports both Docker Compose and Kubernetes deployment modes

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-docker}"  # docker or kubernetes
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"
SSL_SETUP="${SSL_SETUP:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if running as appropriate user
    if [[ "$DEPLOYMENT_MODE" == "docker" && $EUID -eq 0 ]]; then
        warn "Running as root. Consider using a non-root user with docker group membership."
    fi
    
    # Check required commands based on deployment mode
    if [[ "$DEPLOYMENT_MODE" == "docker" ]]; then
        command -v docker >/dev/null 2>&1 || error "Docker is not installed"
        command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
        
        # Check Docker daemon
        docker info >/dev/null 2>&1 || error "Docker daemon is not running"
        
    elif [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        command -v kubectl >/dev/null 2>&1 || error "kubectl is not installed"
        command -v helm >/dev/null 2>&1 || warn "Helm is not installed (optional)"
        
        # Check Kubernetes connection
        kubectl cluster-info >/dev/null 2>&1 || error "Cannot connect to Kubernetes cluster"
    fi
    
    # Check if environment file exists
    if [[ ! -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]]; then
        error "Environment file .env.$ENVIRONMENT not found"
    fi
    
    log "Prerequisites check completed"
}

# Function to create backup before deployment
create_backup() {
    if [[ "$BACKUP_BEFORE_DEPLOY" != "true" ]]; then
        return 0
    fi
    
    log "Creating backup before deployment..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="pre_deploy_backup_${backup_timestamp}"
    
    if [[ "$DEPLOYMENT_MODE" == "docker" ]]; then
        # Docker-based backup
        cd "$PROJECT_ROOT"
        if docker-compose -f docker-compose.prod.yml ps | grep -q "school_backend"; then
            docker-compose -f docker-compose.prod.yml exec -T backend_1 \
                python manage.py backup_database backup \
                --compress \
                --backup-dir /opt/backups \
                --file "${backup_name}.sql.gz"
        else
            warn "Backend containers not running, skipping database backup"
        fi
    elif [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        # Kubernetes-based backup
        local backend_pod=$(kubectl get pods -n mwalimu-school -l app=backend -o jsonpath='{.items[0].metadata.name}')
        if [[ -n "$backend_pod" ]]; then
            kubectl exec -n mwalimu-school "$backend_pod" -- \
                python manage.py backup_database backup \
                --compress \
                --backup-dir /opt/backups \
                --file "${backup_name}.sql.gz"
        else
            warn "No backend pods found, skipping database backup"
        fi
    fi
    
    log "Backup created: ${backup_name}.sql.gz"
}

# Function to setup SSL certificates
setup_ssl() {
    if [[ "$SSL_SETUP" != "true" ]]; then
        return 0
    fi
    
    log "Setting up SSL certificates..."
    
    if [[ -f "$PROJECT_ROOT/nginx/ssl/setup-ssl.sh" ]]; then
        chmod +x "$PROJECT_ROOT/nginx/ssl/setup-ssl.sh"
        "$PROJECT_ROOT/nginx/ssl/setup-ssl.sh" production
    else
        warn "SSL setup script not found, skipping SSL configuration"
    fi
}

# Function for Docker deployment
deploy_docker() {
    log "Starting Docker deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    export $(grep -v '^#' .env.$ENVIRONMENT | xargs)
    
    # Build images
    log "Building Docker images..."
    docker-compose -f docker-compose.prod.yml --env-file .env.$ENVIRONMENT build --no-cache
    
    # Deploy with zero-downtime strategy
    log "Deploying containers with zero-downtime strategy..."
    
    # Start new containers alongside existing ones
    docker-compose -f docker-compose.prod.yml --env-file .env.$ENVIRONMENT up -d --no-deps --scale backend_1=0 backend_2 backend_3
    
    # Wait for new containers to be healthy
    log "Waiting for new containers to be healthy..."
    sleep 30
    
    # Health check new containers
    for i in {1..10}; do
        if docker-compose -f docker-compose.prod.yml exec -T backend_2 curl -f http://localhost:8000/monitoring/health/ >/dev/null 2>&1; then
            log "New backend containers are healthy"
            break
        fi
        
        if [[ $i -eq 10 ]]; then
            error "New backend containers failed health check"
        fi
        
        log "Health check attempt $i/10..."
        sleep 10
    done
    
    # Scale up new containers and scale down old ones
    docker-compose -f docker-compose.prod.yml --env-file .env.$ENVIRONMENT up -d --scale backend_1=2 --scale backend_2=2
    
    # Wait and then remove old containers
    sleep 30
    docker-compose -f docker-compose.prod.yml --env-file .env.$ENVIRONMENT up -d --scale backend_1=2 --scale backend_2=2 --remove-orphans
    
    # Update nginx and other services
    docker-compose -f docker-compose.prod.yml --env-file .env.$ENVIRONMENT up -d nginx redis frontend
    
    log "Docker deployment completed successfully"
}

# Function for Kubernetes deployment
deploy_kubernetes() {
    log "Starting Kubernetes deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Apply namespace and basic resources
    log "Applying Kubernetes manifests..."
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secrets.yaml
    kubectl apply -f k8s/persistent-volumes.yaml
    
    # Deploy Redis first (dependency)
    log "Deploying Redis..."
    kubectl apply -f k8s/redis-deployment.yaml
    kubectl rollout status statefulset/redis-statefulset -n mwalimu-school --timeout=300s
    
    # Deploy backend with rolling update
    log "Deploying backend services..."
    kubectl apply -f k8s/backend-deployment.yaml
    kubectl rollout status deployment/backend-deployment -n mwalimu-school --timeout=600s
    
    # Deploy nginx/frontend
    log "Deploying frontend services..."
    kubectl apply -f k8s/nginx-deployment.yaml
    kubectl rollout status deployment/nginx-deployment -n mwalimu-school --timeout=300s
    
    # Verify deployment
    log "Verifying Kubernetes deployment..."
    kubectl get pods -n mwalimu-school
    
    # Run health checks
    local backend_pod=$(kubectl get pods -n mwalimu-school -l app=backend -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$backend_pod" ]]; then
        kubectl exec -n mwalimu-school "$backend_pod" -- curl -f http://localhost:8000/monitoring/health/
    fi
    
    log "Kubernetes deployment completed successfully"
}

# Function to run post-deployment tasks
post_deployment_tasks() {
    log "Running post-deployment tasks..."
    
    if [[ "$DEPLOYMENT_MODE" == "docker" ]]; then
        # Docker post-deployment tasks
        cd "$PROJECT_ROOT"
        
        # Run database migrations
        log "Running database migrations..."
        docker-compose -f docker-compose.prod.yml --env-file .env.$ENVIRONMENT exec -T backend_1 \
            python manage.py migrate --noinput
        
        # Collect static files
        log "Collecting static files..."
        docker-compose -f docker-compose.prod.yml --env-file .env.$ENVIRONMENT exec -T backend_1 \
            python manage.py collectstatic --noinput --clear
        
        # Run production setup
        log "Running production setup..."
        docker-compose -f docker-compose.prod.yml --env-file .env.$ENVIRONMENT exec -T backend_1 \
            python manage.py setup_production_db --skip-migrations
        
        # Health check
        log "Final health check..."
        sleep 15
        curl -f http://localhost/monitoring/health/ || error "Final health check failed"
        
    elif [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        # Kubernetes post-deployment tasks
        local backend_pod=$(kubectl get pods -n mwalimu-school -l app=backend -o jsonpath='{.items[0].metadata.name}')
        
        if [[ -n "$backend_pod" ]]; then
            # Run database migrations
            log "Running database migrations..."
            kubectl exec -n mwalimu-school "$backend_pod" -- \
                python manage.py migrate --noinput
            
            # Collect static files
            log "Collecting static files..."
            kubectl exec -n mwalimu-school "$backend_pod" -- \
                python manage.py collectstatic --noinput --clear
            
            # Run production setup
            log "Running production setup..."
            kubectl exec -n mwalimu-school "$backend_pod" -- \
                python manage.py setup_production_db --skip-migrations
        fi
        
        # Health check via service
        log "Final health check..."
        sleep 15
        kubectl port-forward -n mwalimu-school service/nginx-service 8080:80 &
        local port_forward_pid=$!
        sleep 5
        curl -f http://localhost:8080/health || warn "Health check via port-forward failed"
        kill $port_forward_pid 2>/dev/null || true
    fi
    
    log "Post-deployment tasks completed"
}

# Function to display deployment summary
deployment_summary() {
    log "=== DEPLOYMENT SUMMARY ==="
    
    if [[ "$DEPLOYMENT_MODE" == "docker" ]]; then
        echo "Deployment Mode: Docker Compose"
        echo "Environment: $ENVIRONMENT"
        echo "Services Status:"
        docker-compose -f docker-compose.prod.yml ps
        
        echo -e "\nHealth Endpoints:"
        echo "- Health: http://localhost/monitoring/health/"
        echo "- Ready: http://localhost/monitoring/ready/"
        echo "- Metrics: http://localhost/monitoring/metrics/"
        
    elif [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        echo "Deployment Mode: Kubernetes"
        echo "Environment: $ENVIRONMENT"
        echo "Namespace: mwalimu-school"
        echo ""
        echo "Pods Status:"
        kubectl get pods -n mwalimu-school
        echo ""
        echo "Services:"
        kubectl get services -n mwalimu-school
        echo ""
        echo "Ingress:"
        kubectl get ingress -n mwalimu-school
    fi
    
    log "=== DEPLOYMENT COMPLETED SUCCESSFULLY ==="
}

# Function to rollback deployment
rollback_deployment() {
    error "Deployment failed. Initiating rollback..."
    
    if [[ "$DEPLOYMENT_MODE" == "docker" ]]; then
        # Docker rollback - restore from backup and restart previous containers
        warn "Manual rollback required for Docker deployment"
        
    elif [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        # Kubernetes rollback
        kubectl rollout undo deployment/backend-deployment -n mwalimu-school
        kubectl rollout undo deployment/nginx-deployment -n mwalimu-school
    fi
}

# Main deployment function
main() {
    log "Starting production deployment for Mwalimu School Management System"
    log "Deployment Mode: $DEPLOYMENT_MODE"
    log "Environment: $ENVIRONMENT"
    
    # Set trap for cleanup on failure
    trap 'rollback_deployment' ERR
    
    check_prerequisites
    create_backup
    setup_ssl
    
    if [[ "$DEPLOYMENT_MODE" == "docker" ]]; then
        deploy_docker
    elif [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        deploy_kubernetes
    else
        error "Invalid deployment mode: $DEPLOYMENT_MODE. Use 'docker' or 'kubernetes'"
    fi
    
    post_deployment_tasks
    deployment_summary
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -m, --mode MODE          Deployment mode: docker or kubernetes (default: docker)"
    echo "  -e, --env ENVIRONMENT    Environment: production, staging (default: production)"
    echo "  -b, --backup             Create backup before deployment (default: true)"
    echo "  -s, --ssl                Setup SSL certificates (default: false)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOYMENT_MODE         Same as --mode"
    echo "  ENVIRONMENT             Same as --env"
    echo "  BACKUP_BEFORE_DEPLOY    Same as --backup"
    echo "  SSL_SETUP               Same as --ssl"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Docker deployment with defaults"
    echo "  $0 -m kubernetes -e production -s    # Kubernetes deployment with SSL"
    echo "  $0 --mode docker --env staging       # Docker staging deployment"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            DEPLOYMENT_MODE="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--backup)
            BACKUP_BEFORE_DEPLOY="true"
            shift
            ;;
        -s|--ssl)
            SSL_SETUP="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" != "docker" && "$DEPLOYMENT_MODE" != "kubernetes" ]]; then
    error "Invalid deployment mode: $DEPLOYMENT_MODE"
fi

# Run main deployment
main "$@"