# GitHub Deployment Guide

This guide covers deploying the Mwalimu School Management System using GitHub Actions and GitHub-specific features.

## 🚀 GitHub Actions Workflow

The project uses a comprehensive GitHub Actions workflow located at `.github/workflows/ci.yml` that provides:

### Workflow Features
- **🔍 Configuration Validation**: Validates YAML and Python configuration files
- **🧪 Backend Testing**: Runs Django tests with PostgreSQL and Redis services
- **🎨 Frontend Testing**: Builds and tests the Next.js/React application
- **📝 Code Quality**: ESLint, Prettier, Black, isort, and Flake8 checks
- **🛡️ Security Scanning**: Safety, Bandit, and Semgrep security analysis
- **🐳 Docker Building**: Multi-stage Docker builds with GitHub Container Registry
- **🚀 Deployment**: Automated staging and production deployments
- **📊 Monitoring**: Post-deployment health checks and status reporting

### Workflow Triggers
- **Push to main**: Triggers full pipeline including production deployment
- **Push to develop**: Triggers full pipeline including staging deployment
- **Pull Requests**: Runs tests and quality checks (no deployment)
- **Manual Trigger**: Can be triggered manually via GitHub UI

## 🔧 Repository Setup

### 1. Fork or Clone the Repository
```bash
git clone https://github.com/DMS943/mwalimu-school-management-system.git
cd mwalimu-school-management-system
```

### 2. GitHub Secrets Configuration
Configure the following secrets in your GitHub repository settings:

#### Required Secrets (for production deployment)
```
DEPLOY_SERVER=your.production.server.com
DEPLOY_USER=deploy-user
SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
DATABASE_PASSWORD=your-production-db-password
SECRET_KEY=your-django-secret-key
```

#### Optional Secrets (for enhanced features)
```
CODECOV_TOKEN=your-codecov-token
SLACK_WEBHOOK_URL=your-slack-webhook-for-notifications
DOCKER_REGISTRY_TOKEN=ghcr-token-for-private-repos
```

### 3. Environment Configuration
Set up GitHub Environments for different deployment stages:

#### Staging Environment
- **Name**: `staging`
- **URL**: `https://staging-mwalimu.yourdomain.com`
- **Protection Rules**: None (auto-deploy from develop branch)

#### Production Environment
- **Name**: `production`
- **URL**: `https://mwalimu.yourdomain.com`
- **Protection Rules**: 
  - Require review from CODEOWNERS
  - Restrict to main branch only

## 🐳 GitHub Container Registry

The workflow automatically builds and pushes Docker images to GitHub Container Registry (GHCR):

### Image Tags
- `ghcr.io/dms943/mwalimu-school-management-system:latest` - Latest from main branch
- `ghcr.io/dms943/mwalimu-school-management-system:main-<sha>` - Specific commit from main
- `ghcr.io/dms943/mwalimu-school-management-system:develop-<sha>` - Specific commit from develop

### Pulling Images
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull the latest image
docker pull ghcr.io/dms943/mwalimu-school-management-system:latest
```

## 📊 Monitoring and Status

### Status Badges
The README includes several status badges:
- **CI/CD Pipeline**: Shows current build status
- **Last Commit**: Shows repository activity
- **Open Issues**: Shows number of open issues

### Viewing Workflow Runs
1. Navigate to the [Actions tab](https://github.com/DMS943/mwalimu-school-management-system/actions)
2. Click on any workflow run to see detailed logs
3. Each job shows step-by-step execution with timing information

### Debugging Failed Builds
1. **Check the workflow logs** in the Actions tab
2. **Review the specific failed job** and step
3. **Common issues**:
   - Missing secrets or environment variables
   - Test failures (check test logs)
   - Build errors (check dependency installation)
   - Deployment failures (check server connectivity)

## 🚀 Deployment Process

### Automatic Deployment
1. **Staging**: Pushes to `develop` branch automatically deploy to staging
2. **Production**: Pushes to `main` branch automatically deploy to production

### Manual Deployment
1. Go to the Actions tab
2. Select the "🚀 Mwalimu School Management CI/CD" workflow
3. Click "Run workflow"
4. Select the branch and environment
5. Click "Run workflow" button

### Deployment Steps
The deployment process includes:
1. **Pre-deployment validation**
2. **Docker image build and push**
3. **Server connection and authentication**
4. **Service stop and backup**
5. **Image pull and container restart**
6. **Database migrations**
7. **Static file collection**
8. **Health checks and validation**
9. **Rollback on failure**

## 🔐 Security Features

### Automated Security Scanning
- **Dependency Scanning**: Checks for vulnerable packages
- **Static Code Analysis**: Identifies security issues in code
- **Secret Scanning**: Prevents accidental secret commits
- **Container Scanning**: Scans Docker images for vulnerabilities

### Security Best Practices
- All secrets are encrypted in GitHub
- Limited scope tokens for container registry
- Environment-based access controls
- Automated security updates via Dependabot

## 🛠 Customization

### Modifying the Workflow
1. Edit `.github/workflows/ci.yml`
2. Test changes on a feature branch first
3. Use workflow dispatch for testing
4. Monitor logs carefully after changes

### Adding New Environments
1. Create environment in GitHub repository settings
2. Add environment-specific secrets
3. Update workflow to include new environment
4. Configure protection rules as needed

### Custom Deployment Scripts
Place custom deployment scripts in `.github/scripts/` directory:
- `deploy-staging.sh` - Staging deployment customizations
- `deploy-production.sh` - Production deployment customizations
- `health-check.sh` - Custom health check logic

## 📞 Troubleshooting

### Common Issues
1. **Build Failures**: Check dependency versions and test failures
2. **Deployment Failures**: Verify server access and Docker setup
3. **Secret Issues**: Ensure all required secrets are configured
4. **Permission Errors**: Check GitHub token permissions

### Getting Help
- Create an [issue](https://github.com/DMS943/mwalimu-school-management-system/issues)
- Check [workflow runs](https://github.com/DMS943/mwalimu-school-management-system/actions) for error logs
- Review this documentation for configuration details
- Check the main README for project-specific setup instructions

## 🔄 Migration from GitLab

If migrating from GitLab CI/CD:
1. **Export GitLab variables** to GitHub secrets
2. **Update deployment scripts** to use GitHub-specific features
3. **Configure GitHub environments** to match GitLab environments
4. **Test the workflow** thoroughly before production use
5. **Update documentation** to reference GitHub instead of GitLab

The GitHub Actions workflow provides enhanced features compared to the original GitLab CI/CD:
- Better visual feedback and status reporting
- More comprehensive security scanning
- Integrated container registry
- Enhanced caching and performance optimizations
- Better integration with GitHub ecosystem (Issues, PRs, etc.)