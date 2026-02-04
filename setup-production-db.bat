@echo off
echo Setting up production database...

echo Creating production database and user...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -h localhost -p 5432 -U postgres -f database\setup_production.sql

echo Applying schema to production database...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -h localhost -p 5432 -U wuc_admin -d wuc_admissions_prod -f database\schema.sql

if %ERRORLEVEL% EQU 0 (
    echo Production database setup completed successfully!
    echo Database: wuc_admissions_prod
    echo User: wuc_admin
) else (
    echo Error setting up production database.
)

pause