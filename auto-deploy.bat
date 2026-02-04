@echo off
echo 🚀 Auto-deploying WUC Admission Portal to AWS Lightsail...
echo 📍 Target Server: 107.20.160.131

set SERVER_IP=107.20.160.131
set SERVER_USER=ubuntu
set PROJECT_NAME=wuc-admission-portal

echo 📦 Creating deployment package...
if exist deployment-temp rmdir /s /q deployment-temp
mkdir deployment-temp

echo 📋 Copying project files...
xcopy /E /I /H /Y backend deployment-temp\backend
xcopy /E /I /H /Y frontend deployment-temp\frontend
xcopy /E /I /H /Y database deployment-temp\database
xcopy /E /I /H /Y deployment deployment-temp\deployment
copy *.md deployment-temp\
copy *.json deployment-temp\

echo 🗑️ Cleaning up unnecessary files...
rmdir /s /q deployment-temp\backend\node_modules 2>nul
rmdir /s /q deployment-temp\frontend\node_modules 2>nul
rmdir /s /q deployment-temp\backend\uploads 2>nul
del deployment-temp\backend\*.log 2>nul

echo 📤 Uploading to Lightsail instance...
scp -r deployment-temp/* %SERVER_USER%@%SERVER_IP%:/home/%SERVER_USER%/%PROJECT_NAME%/

echo 🔧 Running deployment on server...
ssh %SERVER_USER%@%SERVER_IP% "bash -s" < deploy-server-setup.sh

echo ✅ Deployment completed!
echo 🌐 Frontend: http://107.20.160.131
echo 🔗 API: http://107.20.160.131/api
echo 💚 Health: http://107.20.160.131/api/health

rmdir /s /q deployment-temp
pause