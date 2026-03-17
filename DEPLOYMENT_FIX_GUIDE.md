# 🚀 Deployment Fix Guide

## 🔍 **Issue Analysis**
Your GitLab CI/CD deployment is failing. Based on the logs, here are the most likely causes and solutions:

## 🛠️ **Quick Fix Steps**

### 1. **Set Up Environment Variables in GitLab**
Go to your GitLab project → Settings → CI/CD → Variables and add:

```bash
SECRET_KEY=your-super-secret-key-at-least-50-characters-long
DATABASE_NAME=school_management
DATABASE_USER=school_admin
DATABASE_PASSWORD=your-secure-database-password
ALLOWED_HOSTS=yourschool.com,www.yourschool.com,localhost
CORS_ALLOWED_ORIGINS=https://yourschool.com,https://www.yourschool.com
```

### 2. **Run the Deployment Fix Script**
On your server, run:
```bash
chmod +x fix-deployment.sh
./fix-deployment.sh
```

### 3. **Manual Deployment (Alternative)**
If GitLab CI fails, deploy manually:

```bash
# 1. Clone/pull the latest code
git pull origin main

# 2. Copy environment file
cp .env.example.production .env.production

# 3. Edit environment variables
nano .env.production

# 4. Run the fix script
./fix-deployment.sh
```

## 🔧 **Detailed Troubleshooting**

### **Check Container Status**
```bash
docker-compose -f docker-compose.prod.yml ps
```

### **View Logs**
```bash
# Backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Frontend logs
docker-compose -f docker-compose.prod.yml logs frontend

# Database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### **Run Troubleshooting Script**
```bash
chmod +x deployment/troubleshoot.sh
./deployment/troubleshoot.sh
```

## 🎯 **Common Issues & Solutions**

### **Issue 1: Environment Variables Missing**
**Solution:** Set all required variables in GitLab CI/CD settings

### **Issue 2: Database Connection Failed**
**Solution:** 
```bash
# Check if database is running
docker-compose -f docker-compose.prod.yml up -d postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec backend python manage.py check --database default
```

### **Issue 3: Migration Errors**
**Solution:**
```bash
# Run migrations manually
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# If migrations fail, reset (CAUTION: This deletes data!)
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate --fake-initial
```

### **Issue 4: Static Files Not Loading**
**Solution:**
```bash
# Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### **Issue 5: Port Conflicts**
**Solution:**
```bash
# Check what's using port 80
sudo netstat -tulpn | grep :80

# Stop conflicting services
sudo systemctl stop apache2  # or nginx if running separately
```

## 🏥 **Health Checks**

After deployment, verify everything works:

```bash
# Check if services respond
curl http://localhost/health/
curl http://localhost/api/

# Check frontend
curl http://localhost/

# Check admin panel
curl http://localhost/admin/
```

## 🔐 **Security Checklist**

- [ ] Change default admin password (admin/admin123)
- [ ] Set strong SECRET_KEY
- [ ] Use secure database password
- [ ] Configure SSL certificates
- [ ] Set proper ALLOWED_HOSTS
- [ ] Enable firewall rules

## 📞 **Getting Help**

If you're still having issues:

1. **Run the troubleshooting script:** `./deployment/troubleshoot.sh`
2. **Check GitLab CI logs** in your GitLab project
3. **Verify environment variables** are set correctly
4. **Check server resources** (disk space, memory)

## 🎉 **Success Indicators**

Your deployment is successful when:
- ✅ All containers are running: `docker-compose -f docker-compose.prod.yml ps`
- ✅ Health check passes: `curl http://localhost/health/`
- ✅ Frontend loads: `curl http://localhost/`
- ✅ API responds: `curl http://localhost/api/`
- ✅ You can login to the admin panel

## 📋 **Default Credentials**

After successful deployment:
- **Admin:** admin / admin123
- **Teacher:** teacher1 / teacher123  
- **Parent:** pmbewe / parent123

**⚠️ IMPORTANT: Change these passwords immediately in production!**