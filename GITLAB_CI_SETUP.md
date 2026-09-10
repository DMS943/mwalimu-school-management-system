# 🔧 GitLab CI/CD Setup Guide

## 📋 Required Environment Variables

To fix your deployment pipeline, you need to set these variables in your GitLab project:

**Go to:** Your GitLab Project → Settings → CI/CD → Variables → Expand

### 🔐 Required Variables

| Variable | Value | Description |
|----------|--------|-------------|
| `SECRET_KEY` | `your-super-secret-key-minimum-50-characters-long-12345` | Django secret key (generate a secure one!) |
| `DATABASE_NAME` | `school_management` | PostgreSQL database name |
| `DATABASE_USER` | `school_admin` | Database username |
| `DATABASE_PASSWORD` | `your-secure-db-password-123` | Database password (use a strong one!) |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,yourschool.com,www.yourschool.com` | Allowed hosts for Django |
| `CORS_ALLOWED_ORIGINS` | `https://yourschool.com,https://www.yourschool.com,http://localhost:3000` | CORS allowed origins |

### 🔧 Optional Variables (for staging deployment)

| Variable | Value | Description |
|----------|--------|-------------|
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | SSH private key for staging server |
| `STAGING_SERVER` | `staging.yourschool.com` | Staging server hostname |
| `STAGING_USER` | `ubuntu` | SSH user for staging |
| `STAGING_PATH` | `/var/www/school-management` | Path on staging server |

## 🚀 Quick Setup Steps

### 1. Generate Secure Values

**Secret Key Generator (Python):**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Or use online generator:** https://djecrety.ir/

### 2. Set Variables in GitLab

1. Go to your GitLab project
2. Navigate to **Settings** → **CI/CD**
3. Expand **Variables** section
4. Click **Add variable** for each required variable
5. Set **Type** to "Variable" (not "File")
6. Check **Protect variable** for production values
7. Check **Mask variable** for sensitive data

### 3. Variable Configuration Tips

- **SECRET_KEY**: Must be at least 50 characters
- **DATABASE_PASSWORD**: Use a strong password (letters, numbers, symbols)
- **ALLOWED_HOSTS**: Include all domains that will access your app
- **CORS_ALLOWED_ORIGINS**: Include frontend URLs

## 🔍 Troubleshooting GitLab CI

### Common Issues:

1. **"Missing required environment variables"**
   - Check all variables are set in GitLab CI/CD settings
   - Ensure variable names match exactly (case-sensitive)

2. **"Database connection failed"**
   - Verify DATABASE_* variables are correct
   - Check GitLab runner has Docker support

3. **"Docker build failed"**
   - Check Dockerfile syntax
   - Verify requirements.txt exists
   - Ensure GitLab runner has sufficient resources

4. **"Container health check failed"**
   - Check logs in GitLab CI job output
   - Verify ALLOWED_HOSTS includes localhost

### Debug Commands for GitLab CI

Add these to your `.gitlab-ci.yml` for debugging:

```yaml
script:
  - echo "Checking environment variables..."
  - env | grep -E "(SECRET_KEY|DATABASE_)" | head -c 20
  - echo "Checking Docker..."
  - docker --version
  - docker-compose --version
  - echo "Building images..."
  # ... rest of deployment script
```

## 🎯 Testing Your Setup

After setting variables, trigger a manual deployment:

1. Go to **CI/CD** → **Pipelines**
2. Click **Run Pipeline**
3. Select `main` branch
4. The `deploy-production` job should appear
5. Click the ▶️ play button to run it manually

## 🔒 Security Best Practices

1. **Use strong passwords** (12+ characters, mixed case, numbers, symbols)
2. **Rotate secrets regularly** (every 6-12 months)
3. **Protect sensitive variables** in GitLab
4. **Use different credentials** for staging and production
5. **Enable two-factor authentication** on GitLab

## 📞 Getting Help

If deployment still fails after setting these variables:

1. Check the GitLab CI job logs for specific error messages
2. Run the troubleshooting script: `./deployment/troubleshoot.sh`
3. Verify your server has Docker and Docker Compose installed
4. Check server resources (disk space, memory)

## ✅ Success Checklist

- [ ] All environment variables are set in GitLab CI/CD
- [ ] SECRET_KEY is at least 50 characters long
- [ ] Database credentials are secure
- [ ] ALLOWED_HOSTS includes your domain
- [ ] GitLab pipeline runs without errors
- [ ] Application is accessible at your domain
- [ ] Admin login works with default credentials
- [ ] Default passwords have been changed

Your deployment should now work! 🎉