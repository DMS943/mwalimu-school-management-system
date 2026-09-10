FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    python3-dev \
    libpq-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements files first for better Docker layer caching
COPY requirements.txt requirements-prod.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy project files
COPY . .

# Create directories for static and media files with proper permissions
RUN mkdir -p /app/staticfiles /app/media

# Make sure the entrypoint script is executable
RUN chmod +x /entrypoint.sh

# Create non-root user for security but keep root for now to avoid permission issues
# RUN addgroup --system django && adduser --system --group django
# RUN chown -R django:django /app
# USER django

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
