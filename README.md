# Mwalimu School Management System

![CI/CD Pipeline](https://github.com/DMS943/mwalimu-school-management-system/actions/workflows/ci.yml/badge.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/DMS943/mwalimu-school-management-system)
![GitHub issues](https://img.shields.io/github/issues/DMS943/mwalimu-school-management-system)

A comprehensive school management system built with Django REST Framework backend and React TypeScript frontend. This system provides role-based access for administrators, teachers, students, and parents with features for academic management, reporting, and communication.

*Mwalimu* means "teacher" in Swahili and represents our commitment to empowering educators and enhancing learning experiences across Zambian schools.

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
- **GitHub Actions** - Continuous integration and deployment
- **GitHub Container Registry** - Docker image storage
- **Nginx** - Web server and reverse proxy

## 📋 Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **PostgreSQL 12+**
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/DMS943/mwalimu-school-management-system.git
cd mwalimu-school-management-system
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
mwalimu-school-system/
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

The project includes a comprehensive GitHub Actions CI/CD pipeline with:

### Pipeline Stages
- **🔍 Validation**: Configuration and dependency validation
- **🧪 Backend Tests**: Django test suite with PostgreSQL and Redis
- **🎨 Frontend Tests**: React/TypeScript testing and building
- **📝 Code Quality**: Linting, formatting, and code analysis
- **🛡️ Security Scanning**: Dependency vulnerability scans and static analysis
- **🐳 Docker Build**: Multi-stage Docker image builds with caching
- **🚀 Deployment**: Automated staging and production deployments
- **📊 Monitoring**: Post-deployment health checks and monitoring

### GitHub Actions Features
- **Visual Status Indicators**: Emoji-enhanced job names and status reporting
- **Parallel Execution**: Jobs run concurrently for faster feedback
- **Comprehensive Caching**: Dependency and build artifact caching
- **Security Scanning**: Automated vulnerability detection
- **Multi-environment Support**: Separate staging and production workflows

### Environment Configuration
The pipeline supports multiple environments with automatic deployment:
- **Staging**: Deploys from `develop` branch
- **Production**: Deploys from `main` branch

### Monitoring GitHub Actions
- Visit the [Actions tab](https://github.com/DMS943/mwalimu-school-management-system/actions) to view workflow runs
- Check the status badges in the README for current build status
- Review detailed logs for debugging failed builds

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

We welcome contributions to the Mwalimu School Management System! Here's how you can get involved:

### Getting Started
1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mwalimu-school-management-system.git
   cd mwalimu-school-management-system
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/DMS943/mwalimu-school-management-system.git
   ```

### Development Workflow
1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes** following our coding standards
3. **Run tests** to ensure everything works:
   ```bash
   # Backend tests
   cd backend && python manage.py test
   
   # Frontend tests
   npm run test
   
   # Linting and formatting
   npm run lint
   npm run format:check
   ```
4. **Commit your changes** with descriptive messages:
   ```bash
   git commit -m "✨ Add feature: description of your changes"
   ```
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request** on GitHub

### Pull Request Guidelines
- **Clear Description**: Explain what changes you've made and why
- **Link Issues**: Reference any related GitHub issues
- **Tests**: Ensure all tests pass and add new tests for new features
- **Documentation**: Update documentation if needed
- **Code Quality**: Follow existing code style and conventions

### Code Standards
- **Backend**: Follow Django best practices and PEP 8
- **Frontend**: Use TypeScript, follow React best practices
- **Commits**: Use conventional commit messages with emojis
- **Testing**: Maintain or improve test coverage

### Reporting Issues
- Use the [GitHub Issues](https://github.com/DMS943/mwalimu-school-management-system/issues) page
- Provide detailed reproduction steps
- Include environment details (OS, Python version, Node version)
- Add relevant logs or error messages
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

## 📊 Repository Information

- **GitHub Repository**: https://github.com/DMS943/mwalimu-school-management-system
- **Issues & Bug Reports**: [GitHub Issues](https://github.com/DMS943/mwalimu-school-management-system/issues)
- **CI/CD Pipeline**: [GitHub Actions](https://github.com/DMS943/mwalimu-school-management-system/actions)
- **License**: MIT License
- **Latest Release**: Check [Releases](https://github.com/DMS943/mwalimu-school-management-system/releases)

### Migration from GitLab
This project was successfully migrated from GitLab to GitHub with enhanced CI/CD features:
- ✅ Enhanced GitHub Actions pipeline with visual indicators
- ✅ Multi-stage deployment workflows (staging/production)
- ✅ Comprehensive security scanning and code quality checks
- ✅ Docker image builds with GitHub Container Registry
- ✅ Automated dependency vulnerability scanning

**Built with ❤️ for Zambian educational institutions**