@echo off

echo Setting up Django backend...

REM Create virtual environment
python -m venv venv

REM Activate virtual environment
call venv\Scripts\activate

REM Install dependencies
pip install -r requirements.txt

REM Copy environment file
if not exist .env (
    copy .env.example .env
    echo Created .env file. Please update with your database credentials.
)

REM Run migrations
python manage.py makemigrations
python manage.py migrate

echo Setup complete! Create a superuser with: python manage.py createsuperuser
echo Run the server with: python manage.py runserver
