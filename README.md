# School Management System

A comprehensive school management system built with Django REST Framework backend and React TypeScript frontend. This system provides role-based access for administrators, teachers, students, and parents with features for academic management, reporting, and communication.

## 🚀 Features

### For Administrators
- **Student Management**: Add, edit, and manage student records
- **Teacher Management**: Manage teacher accounts and assignments
- **Class Management**: Create and organize classes and subjects
- **Academic Settings**: Configure terms, subjects, and grading systems
- **Comprehensive Reports**: Generate detailed academic reports
- **System Configuration**: Manage school settings and user permissions

### For Teachers
- **Class Management**: View assigned classes and students
- **Grade Management**: Record and update student grades
- **Attendance Tracking**: Mark and monitor student attendance
- **Schedule Management**: View teaching schedules
- **Student Reports**: Generate individual and class reports
- **Academic Progress**: Track student performance over time

### For Students
- **Personal Dashboard**: View grades, attendance, and schedule
- **Academic Progress**: Track performance across subjects
- **Schedule Access**: View class timetables
- **Report Cards**: Access generated reports

### For Parents
- **Child Monitoring**: View children's academic progress
- **Report Access**: Download and view report cards
- **Communication**: Stay updated on academic performance
- **Multi-child Support**: Manage multiple children's accounts

## 🛠 Technology Stack

### Backend
- **Django 5.0.2** - Web framework
- **Django REST Framework 3.14.0** - API development
- **PostgreSQL** - Database
- **JWT Authentication** - Secure authentication
- **Django CORS Headers** - Cross-origin resource sharing

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router DOM** - Navigation
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **Axios** - HTTP client

### DevOps & Deployment
- **Docker** - Containerization
- **GitLab CI/CD** - Continuous integration and deployment
- **Nginx** - Web server and reverse proxy

## 📋 Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **PostgreSQL 12+**
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd school-management-system
```

### 2. Backend Setup

#### Option A: Using Setup Script (Recommended)
```bash
cd backend
chmod +x scripts/setup.sh
./scripts/setup.sh
```

#### Option B: Manual Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate secret key
python generate_secret_key.py

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 3. Database Setup

#### Create PostgreSQL Database
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE school_management;
CREATE USER postgres WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE school_management TO postgres;
```

#### Load Sample Data (Optional)
```bash
cd backend
python manage.py shell < sql/03_sample_data.sql
```

### 4. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Start the Application

#### Backend
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python manage.py runserver
```

#### Frontend
```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Django Secret Key (Generate with: python generate_secret_key.py)
SECRET_KEY=your-secret-key-here

# Debug Mode (Set to False in production)
DEBUG=True

# Database Configuration
DATABASE_NAME=school_management
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

# Allowed Hosts (Add your domain in production)
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS Settings (Add your frontend URLs)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Generate Secret Key
```bash
cd backend
python generate_secret_key.py
```

## 📁 Project Structure

```
school-management-system/
├── backend/                    # Django backend
│   ├── apps/                  # Django applications
│   │   ├── academics/         # Academic management
│   │   ├── reports/           # Report generation
│   │   ├── schools/           # School configuration
│   │   ├── students/          # Student management
│   │   └── users/             # User management
│   ├── config/                # Django settings
│   ├── sql/                   # Database scripts
│   └── scripts/               # Setup scripts
├── src/                       # React frontend
│   ├── api/                   # API client
│   ├── components/            # Reusable components
│   ├── pages/                 # Page components
│   └── lib/                   # Utilities
├── deployment/                # Deployment configurations
└── docker-compose.prod.yml    # Production Docker setup
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🚀 CI/CD Pipeline

The project includes GitLab CI/CD configuration with:
- **Test Stage**: Run backend tests
- **Build Stage**: Build Docker images
- **Deploy Stage**: Deploy to staging/production

Configure your GitLab variables:
- `DEPLOY_SERVER`: Server IP address
- `DEPLOY_USER`: SSH username
- `SSH_PRIVATE_KEY`: SSH private key

## 📊 API Documentation

### Authentication
```bash
# Login
POST /api/auth/login/
{
  "username": "your_username",
  "password": "your_password"
}

# Get user profile
GET /api/auth/user/
Authorization: Bearer <token>
```

### Key Endpoints
- **Students**: `/api/students/`
- **Teachers**: `/api/users/teachers/`
- **Classes**: `/api/schools/classes/`
- **Subjects**: `/api/academics/subjects/`
- **Reports**: `/api/reports/`
- **Grades**: `/api/academics/grades/`

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
npm run test
```

## 📝 Sample Data

Load sample data for testing:

```bash
cd backend
python reload_sample_data.py
```

This creates:
- Sample school with classes and subjects
- Test teachers and students
- Sample grades and attendance records
- Parent accounts linked to students

## 🔐 Default Accounts

After loading sample data:

### Admin Account
- **Username**: admin
- **Password**: admin123

### Teacher Account
- **Username**: teacher1
- **Password**: teacher123

### Parent Account
- **Username**: parent1
- **Password**: parent123

## 🛠 Development

### Adding New Features
1. Create Django app: `python manage.py startapp app_name`
2. Add models in `models.py`
3. Create serializers in `serializers.py`
4. Add views in `views.py`
5. Configure URLs in `urls.py`
6. Create React components and pages
7. Add API calls in `src/api/`

### Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
psql -U postgres -l
```

#### Frontend Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### CORS Issues
- Ensure frontend URL is in `CORS_ALLOWED_ORIGINS`
- Check `ALLOWED_HOSTS` includes your domain

### Debug Mode
Set `DEBUG=True` in `.env` for detailed error messages.

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the deployment guide

## 🔄 Updates

To update the system:
1. Pull latest changes: `git pull origin main`
2. Update backend dependencies: `pip install -r requirements.txt`
3. Update frontend dependencies: `npm install`
4. Run migrations: `python manage.py migrate`
5. Restart services

---

**Built with ❤️ for educational institutions**