# GitLab Environment Variables Setup

## Required GitLab CI/CD Variables

Set these in GitLab: Project Settings → CI/CD → Variables

### Production Database (Supabase)
- **SUPABASE_DB_HOST**: `db.bprcdnaagiiixkiuzane.supabase.co` (masked: ✓)
- **SUPABASE_DB_NAME**: `postgres` (masked: ✓)  
- **SUPABASE_DB_USER**: `postgres` (masked: ✓)
- **SUPABASE_DB_PASSWORD**: `P@sswr0d.4575` (masked: ✓)
- **SUPABASE_DB_PORT**: `5432` (masked: ✗ - **DO NOT MASK** - too short)

### Django Settings
- **SECRET_KEY**: Generate a new Django secret key (masked: ✓)
- **ALLOWED_HOSTS**: `localhost,127.0.0.1,yourschool.com` (masked: ✗)
- **CORS_ALLOWED_ORIGINS**: `http://localhost:3000,https://yourschool.com` (masked: ✗)

### SSH Deployment (Optional - for staging)
- **SSH_PRIVATE_KEY**: Your private SSH key for server access (masked: ✓)
- **STAGING_SERVER**: Your staging server IP/hostname (masked: ✗)
- **STAGING_USER**: SSH username (masked: ✗)
- **STAGING_PATH**: Path to project on server (masked: ✗)

## Important Notes

1. **Port Variable**: The `SUPABASE_DB_PORT` variable should NOT be masked because GitLab requires masked variables to have at least 8 characters, but "5432" only has 4 characters.

2. **Default Port**: The application will use port 5432 by default if `SUPABASE_DB_PORT` is not set, so you can even leave this variable empty if needed.

3. **Connection Test**: The CI pipeline will test the Supabase connection before deploying.

## Next Steps

1. Set all variables in GitLab (remember: don't mask the port)
2. Push the updated `.gitlab-ci.yml` to trigger deployment
3. Monitor the pipeline to ensure Supabase connection works

## Connection String Format

The application connects to Supabase using:
```
postgresql://postgres:P@sswr0d.4575@db.bprcdnaagiiixkiuzane.supabase.co:5432/postgres
```