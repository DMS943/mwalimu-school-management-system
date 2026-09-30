# 🚀 Mwalimu School Management System - Launch Guide

## 🎯 **Quick Start: Run the Project**

### **Option 1: Development Mode (Recommended for Testing)**

1. **Backend (Django API)**
   ```bash
   cd backend
   pip install Django djangorestframework django-cors-headers python-decouple
   python manage.py migrate --settings=config.minimal
   python manage.py runserver 8000 --settings=config.minimal
   ```
   Backend will be running at: `http://localhost:8000`

2. **Frontend (React + Vite)**
   ```bash
   # Install dependencies (this might take a few minutes)
   npm install
   
   # Start development server
   npm run dev
   ```
   Frontend will be running at: `http://localhost:5173`

### **Option 2: Production Mode (Docker)**

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost/api
```

### **Option 3: Simple Demo (If Dependencies Fail)**

For a quick demonstration without complex setup:

```bash
# Create a simple Django demo
django-admin startproject school_demo
cd school_demo
python manage.py runserver
```
Visit: `http://localhost:8000`

## 🌟 **What You'll See**

### **🎓 Frontend Features**
- **Modern React Dashboard** with school management interface
- **Student Management** - Add, edit, view student profiles
- **Class Management** - Organize students into classes
- **Academic Records** - Track grades and attendance
- **Reports Dashboard** - Generate academic reports
- **Responsive Design** - Works on desktop and mobile

### **⚙️ Backend Features**
- **REST API** endpoints for all school operations
- **JWT Authentication** for secure access
- **Django Admin Panel** for administrative tasks
- **Database Integration** with proper relationships
- **API Documentation** with automatic schema generation

## 🔧 **Development URLs**

When running in development mode:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | `http://localhost:5173` | React application |
| **Backend API** | `http://localhost:8000/api/` | REST API endpoints |
| **Django Admin** | `http://localhost:8000/admin/` | Admin interface |
| **API Docs** | `http://localhost:8000/api/docs/` | API documentation |

## 📁 **Project Structure**

```
mwalimu-school-management-system/
├── backend/                 # Django REST API
│   ├── apps/               # Django applications
│   │   ├── users/         # User management
│   │   ├── students/      # Student profiles
│   │   ├── schools/       # School settings
│   │   ├── academics/     # Academic records
│   │   └── reports/       # Reports generation
│   ├── config/            # Django settings
│   └── manage.py          # Django management
├── src/                    # React frontend
│   ├── components/        # Reusable components
│   ├── pages/            # Application pages
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utility functions
├── docs/                  # Documentation
├── docker-compose.prod.yml # Production deployment
└── package.json           # Frontend dependencies
```

## 🎉 **Features Demonstrated**

### **✅ School Management**
- Create and manage school profiles
- Configure academic terms and sessions
- Set up school-specific settings

### **✅ Student Information System**
- Student enrollment and profiles
- Parent/guardian information
- Academic history tracking

### **✅ Academic Management**
- Class and subject management
- Grade and examination records
- Attendance tracking

### **✅ Reports & Analytics**
- Student performance reports
- Attendance summaries
- Academic progress tracking
- Export capabilities (PDF, Excel)

### **✅ User Management**
- Role-based access (Admin, Teacher, Parent)
- Secure authentication with JWT
- User permissions and authorization

## 🛠️ **Troubleshooting**

### **Common Issues & Solutions:**

1. **Dependencies Installation Slow**
   - Use `npm ci` instead of `npm install`
   - Clear npm cache: `npm cache clean --force`

2. **Backend Import Errors**
   - Install missing packages: `pip install <package_name>`
   - Use the minimal settings: `--settings=config.minimal`

3. **Port Already in Use**
   - Change backend port: `python manage.py runserver 8001`
   - Change frontend port: `npm run dev -- --port 5174`

4. **Database Issues**
   - Reset database: `rm backend/db.sqlite3`
   - Run migrations: `python manage.py migrate`

## 🌐 **Production Deployment**

For production deployment, see:
- **[PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)** - Complete production setup
- **[DOCKER_GUIDE.md](docs/DOCKER_GUIDE.md)** - Containerization guide
- **[SECURITY.md](docs/SECURITY.md)** - Security considerations

## 📞 **Support & Documentation**

- **API Documentation**: Available at `/api/docs/` when backend is running
- **Component Library**: React components in `/src/components/`
- **Database Schema**: Django models in `/backend/apps/*/models.py`
- **Configuration**: Settings in `/backend/config/`

---

**🎓 Ready to manage your school digitally!** 

The Mwalimu School Management System provides a complete solution for educational institutions to manage students, academics, and administrative tasks efficiently.