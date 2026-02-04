# SSH Key Setup for AWS Lightsail Deployment

## Before Running Auto-Deploy

You need to set up SSH key authentication to connect to your Lightsail instance.

### Option 1: Use Lightsail Default Key

1. **Download your Lightsail key:**
   - Go to AWS Lightsail Console
   - Click on your instance
   - Go to "Connect" tab
   - Download the default private key (.pem file)

2. **Setup SSH key (Windows):**
   ```cmd
   # Copy key to SSH directory
   copy LightsailDefaultKey-us-east-1.pem %USERPROFILE%\.ssh\
   
   # Set permissions (if using WSL)
   chmod 600 ~/.ssh/LightsailDefaultKey-us-east-1.pem
   ```

3. **Test connection:**
   ```cmd
   ssh -i %USERPROFILE%\.ssh\LightsailDefaultKey-us-east-1.pem ubuntu@107.20.160.131
   ```

### Option 2: Use SSH Config File

Create `%USERPROFILE%\.ssh\config`:
```
Host lightsail-wuc
    HostName 107.20.160.131
    User ubuntu
    IdentityFile ~/.ssh/LightsailDefaultKey-us-east-1.pem
    StrictHostKeyChecking no
```

Then connect with: `ssh lightsail-wuc`

### Option 3: Generate New SSH Key

```cmd
# Generate new key pair
ssh-keygen -t rsa -b 4096 -f %USERPROFILE%\.ssh\wuc-lightsail

# Copy public key to server
type %USERPROFILE%\.ssh\wuc-lightsail.pub | ssh ubuntu@107.20.160.131 "cat >> ~/.ssh/authorized_keys"
```

## Running the Deployment

Once SSH is configured:

```cmd
# Make sure you can connect
ssh ubuntu@107.20.160.131

# Run the auto-deployment
auto-deploy.bat
```

## Troubleshooting

### SSH Connection Issues
- Ensure your Lightsail instance is running
- Check security group allows SSH (port 22)
- Verify the correct username (usually 'ubuntu' for Ubuntu instances)

### Permission Denied
- Check SSH key permissions: `chmod 600 ~/.ssh/your-key.pem`
- Ensure you're using the correct key file

### SCP Upload Issues
- Make sure the target directory exists on server
- Check disk space on Lightsail instance