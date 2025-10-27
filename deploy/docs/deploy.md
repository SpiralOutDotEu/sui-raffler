# VPS Setup and Deployment Guide

This document describes how to set up a new VPS server for automated deployment
of the Next.js project using GitHub Actions and PM2.

---

## 1. Initial Server Setup

1. Connect to the VPS via SSH:

   ```bash
   ssh root@<SERVER_IP>
   ```

2. Update the system:

   ```bash
   apt update && apt upgrade -y
   ```

3. Create a new deployment user:

   The `adduser` command will prompt you for a password - set a strong password when asked. You won't need to remember it since we'll disable password authentication later.

   ```bash
   adduser deploy
   usermod -aG sudo deploy
   ```

   **Alternative (non-interactive)**: If you prefer to create the user without setting a password:

   ```bash
   adduser --disabled-password deploy
   usermod -aG sudo deploy
   ```

4. Generate dedicated SSH keys for the deploy user (separate from root keys):

   ```bash
   sudo -u deploy ssh-keygen -t ed25519 -f /home/deploy/.ssh/id_ed25519 -N ""
   ```

   This creates:

   - Private key: `/home/deploy/.ssh/id_ed25519`
   - Public key: `/home/deploy/.ssh/id_ed25519.pub`

5. Set proper permissions on the SSH directory:

   ```bash
   sudo chmod 700 /home/deploy/.ssh
   sudo chmod 600 /home/deploy/.ssh/id_ed25519
   sudo chmod 644 /home/deploy/.ssh/id_ed25519.pub
   sudo chown -R deploy:deploy /home/deploy/.ssh
   ```

6. Switch to the new user:

   ```bash
   su - deploy
   ```

---

## 2. Configure SSH Authentication

**On VPS** - Setup for GitHub Actions automation:

1. Add the deploy user's public key to authorized_keys:

   This allows GitHub Actions to authenticate using the matching private key:

   ```bash
   cat /home/deploy/.ssh/id_ed25519.pub >> /home/deploy/.ssh/authorized_keys
   ```

2. Set proper permissions on authorized_keys:

   ```bash
   sudo chmod 600 /home/deploy/.ssh/authorized_keys
   sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
   ```

3. Retrieve the deploy user's private key for GitHub Secrets:

   Display the private key that GitHub Actions will use (while still connected to VPS):

   ```bash
   sudo cat /home/deploy/.ssh/id_ed25519
   ```

   **Important:** Copy the entire output including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`. Save this securely - you'll add it as the `SSH_PRIVATE_KEY` secret in GitHub (see Section 7).

**On Your Local PC** - Personal SSH access:

4. Generate your personal SSH key (if you don't already have one):

   On your local machine:

   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   ```

5. Add your personal public key to the deploy user on the VPS:

   This allows you to SSH into the VPS with your personal key:

   ```bash
   ssh-copy-id deploy@<SERVER_IP>
   ```

   Or manually copy it:

   ```bash
   cat ~/.ssh/id_ed25519.pub | ssh deploy@<SERVER_IP> "cat >> ~/.ssh/authorized_keys"
   ```

**On VPS** - Secure SSH configuration:

6. Configure SSH for security (choose one option):

   **Option A - Disable password authentication for deploy user only (recommended)**:

   Edit SSH config:

   ```bash
   sudo nano /etc/ssh/sshd_config
   ```

   Add these lines at the end of the file:

   ```
   # Keep default settings for root
   PermitRootLogin yes
   PasswordAuthentication yes

   # Require SSH keys for deploy user
   Match User deploy
       PasswordAuthentication no
   ```

   This allows:

   - Root: Password authentication enabled (for emergency access)
   - Deploy user: SSH keys only (more secure)

   **Option B - Disable password authentication globally**:

   Edit SSH config:

   ```bash
   sudo nano /etc/ssh/sshd_config
   ```

   Set:

   ```
   PermitRootLogin no
   PasswordAuthentication no
   ```

   This requires SSH keys for all users.

   After editing, restart SSH:

   ```bash
   sudo systemctl restart ssh
   ```

---

## 3. Install Dependencies

1. Install Git:

   ```bash
   sudo apt install git -y
   ```

2. Install NVM (Node Version Manager):

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   source ~/.bashrc
   ```

3. Install Node.js (LTS 22.11.0):

   ```bash
   nvm install 22.11.0
   nvm alias default 22.11.0
   ```

4. Install PM2 globally:

   ```bash
   npm install -g pm2
   ```

5. (Optional) Set PM2 to auto-start on reboot:

   ```bash
   pm2 startup systemd
   pm2 save
   ```

---

## 4. Clone and Prepare Application

1. Choose an application directory (using `/var/www`):

   Create the directory with proper permissions so both deploy user and root can access it:

   ```bash
   sudo mkdir -p /var/www
   sudo chown deploy:deploy /var/www
   cd /var/www
   ```

2. Clone each environment with its correct branch:

   **Clone main branch for production:**

   ```bash
   git clone -b main https://github.com/SpiralOutDotEu/sui-raffler suiraffler-prod
   ```

   **Clone testnet branch for testnet:**

   ```bash
   git clone -b testnet https://github.com/SpiralOutDotEu/sui-raffler suiraffler-testnet
   ```

   Example paths:

   ```
   /var/www/suiraffler-prod    (from main branch)
   /var/www/suiraffler-testnet  (from testnet branch)
   ```

3. Create environment files for each environment:

   **Mainnet environment file:**

   ```bash
   nano /var/www/suiraffler-prod/frontend/.env.local
   ```

   Add:

   ```env
   NEXT_PUBLIC_NETWORK=mainnet
   NEXT_PUBLIC_PACKAGE_ID=YOUR_MAINNET_PACKAGE_ID
   NEXT_PUBLIC_CONFIG_OBJECT_ID=YOUR_MAINNET_CONFIG_OBJECT_ID
   NEXT_PUBLIC_APP_URL=https://suiraffler.xyz
   ```

   **Testnet environment file:**

   ```bash
   nano /var/www/suiraffler-testnet/frontend/.env.local
   ```

   Add:

   ```env
   NEXT_PUBLIC_NETWORK=testnet
   NEXT_PUBLIC_PACKAGE_ID=YOUR_TESTNET_PACKAGE_ID
   NEXT_PUBLIC_CONFIG_OBJECT_ID=YOUR_TESTNET_CONFIG_OBJECT_ID
   NEXT_PUBLIC_APP_URL=https://testnet.suiraffler.xyz
   ```

   Replace the placeholder values with your actual contract IDs.

4. Install dependencies and build both environments:

   **Mainnet:**

   ```bash
   cd /var/www/suiraffler-prod/frontend
   npm ci
   npm run build
   ```

   **Testnet:**

   ```bash
   cd /var/www/suiraffler-testnet/frontend
   npm ci
   npm run build
   ```

5. Create PM2 ecosystem configuration file:

   According to [PM2 documentation](https://pm2.keymetrics.io/docs/usage/application-declaration/), the configuration file must end with `.config.js` for PM2 to recognize it as a configuration file. Create a single ecosystem file for both apps:

   ```bash
   nano /var/www/ecosystem.config.js
   ```

   Add:

   ```javascript
   module.exports = {
     apps: [
       {
         name: "suiraffler-prod",
         cwd: "/var/www/suiraffler-prod/frontend",
         script: "npm",
         args: "run start",
         env: {
           NODE_ENV: "production",
           PORT: 3000,
         },
         instances: 1,
         exec_mode: "fork",
         max_memory_restart: "512M",
         listen_timeout: 8000,
         kill_timeout: 8000,
       },
       {
         name: "suiraffler-testnet",
         cwd: "/var/www/suiraffler-testnet/frontend",
         script: "npm",
         args: "run start",
         env: {
           NODE_ENV: "production",
           PORT: 3001,
         },
         instances: 1,
         exec_mode: "fork",
         max_memory_restart: "512M",
         listen_timeout: 8000,
         kill_timeout: 8000,
       },
     ],
   };
   ```

6. Start the apps with PM2:

   ```bash
   # Start all apps from the ecosystem file
   pm2 start /var/www/ecosystem.config.js

   # Save the configuration
   pm2 save
   ```

   Verify they're running correctly:

   ```bash
   pm2 list
   pm2 logs suiraffler-prod --lines 20
   pm2 logs suiraffler-testnet --lines 20
   ```

   You should see:

   - `suiraffler-prod` running and listening on port 3000
   - `suiraffler-testnet` running and listening on port 3001

---

## 5. Configure Nginx Reverse Proxy

1. Install Nginx:

   ```bash
   sudo apt install nginx -y
   ```

2. Remove the default nginx site to avoid conflicts:

   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

3. Create site configs for production and testnet:

   **/etc/nginx/sites-available/suiraffler**

   ```
   server {
     server_name suiraffler.xyz www.suiraffler.xyz;
     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

   **/etc/nginx/sites-available/suiraffler-testnet**

   ```
   server {
     server_name testnet.suiraffler.xyz www.testnet.suiraffler.xyz;
     location / {
       proxy_pass http://127.0.0.1:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

4. Enable sites and restart Nginx:

   ```bash
   sudo ln -s /etc/nginx/sites-available/suiraffler /etc/nginx/sites-enabled/
   sudo ln -s /etc/nginx/sites-available/suiraffler-testnet /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. (Optional) Enable HTTPS with Certbot:

   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d suiraffler.xyz -d www.suiraffler.xyz -d testnet.suiraffler.xyz -d www.testnet.suiraffler.xyz
   ```

   This will generate SSL certificates for:

   - suiraffler.xyz
   - www.suiraffler.xyz
   - testnet.suiraffler.xyz
   - www.testnet.suiraffler.xyz

---

## 6. Set Up GitHub Actions Workflow

Create a GitHub Actions workflow file in your repository to automate deployment:

**`.github/workflows/deploy.yml`**

```yaml
name: Deploy Next.js to VPS

on:
  push:
    branches:
      - main
      - testnet

env:
  NODE_VERSION: 22.11.0

jobs:
  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    environment: Production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci --ignore-scripts

      - name: Build project
        working-directory: frontend
        run: npm run build

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: 22
          script_stop: true
          script: |
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            nvm use ${{ env.NODE_VERSION }}

            # Select deployment directory based on branch
            # main branch -> suiraffler-prod (production)
            # testnet branch -> suiraffler-testnet (testnet)
            if [ "${{ github.ref_name }}" = "main" ]; then
              APP_DIR="${{ secrets.APP_DIR_PROD }}"
              SERVICE_NAME="suiraffler-prod"
              BRANCH="main"
            else
              APP_DIR="${{ secrets.APP_DIR_TESTNET }}"
              SERVICE_NAME="suiraffler-testnet"
              BRANCH="testnet"
            fi

            cd $APP_DIR
            git checkout $BRANCH
            git pull origin $BRANCH
            cd frontend
            npm ci --ignore-scripts
            npm run build
            pm2 restart $SERVICE_NAME
```

This workflow:

- Triggers on pushes to `main` and `testnet` branches
- Builds the frontend on GitHub Actions runners
- Deploys to your VPS via SSH
- **main branch** → deploys to `/var/www/suiraffler-prod` and restarts `suiraffler-prod`
- **testnet branch** → deploys to `/var/www/suiraffler-testnet` and restarts `suiraffler-testnet`
- Ensures the correct branch is checked out on the VPS before building

---

## 7. GitHub Secrets and Environment Configuration

In your GitHub repository, open
**Settings → Environments → Production → Environment Secrets** and add:

| Name              | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| `HOST`            | VPS IP address (e.g. `123.45.67.89`)                              |
| `USERNAME`        | Deployment user (e.g. `deploy`)                                   |
| `SSH_PRIVATE_KEY` | Private key used by GitHub Actions to connect to the VPS          |
| `APP_DIR_PROD`    | Path to production app directory, e.g. `/var/www/suiraffler-prod` |
| `APP_DIR_TESTNET` | Path to testnet app directory, e.g. `/var/www/suiraffler-testnet` |

---

## 8. Verify Deployment

After pushing to `main` or `testnet` branch:

1. GitHub Actions will trigger the deployment.
2. The workflow will connect to the VPS, pull latest code, build the frontend, and restart PM2.
3. Visit:

   - **[https://suiraffler.xyz](https://suiraffler.xyz)** or **[https://www.suiraffler.xyz](https://www.suiraffler.xyz)** (production)
   - **[https://testnet.suiraffler.xyz](https://testnet.suiraffler.xyz)** or **[https://www.testnet.suiraffler.xyz](https://www.testnet.suiraffler.xyz)** (testnet)

---

## 9. Useful PM2 Commands

```bash
pm2 list                              # list running apps
pm2 logs suiraffler-prod              # view logs for production
pm2 logs suiraffler-testnet           # view logs for testnet
pm2 logs suiraffler-prod --lines 100  # view last 100 lines
pm2 restart suiraffler-prod           # restart production
pm2 restart suiraffler-testnet        # restart testnet
pm2 restart all                       # restart all apps
pm2 stop suiraffler-prod              # stop production
pm2 delete suiraffler-prod            # delete production from PM2
pm2 save                              # save current process list
pm2 startup systemd                   # generate startup script
pm2 monit                             # real-time monitoring
```

---

This setup ensures both `main` and `testnet` branches are deployed from the same GitHub Actions workflow to their respective domains using a shared "Production" environment and SSH-based deployment.
