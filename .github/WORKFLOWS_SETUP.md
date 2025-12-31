# GitHub Actions Workflows Setup Checklist

Quick reference guide to set up all GitHub Actions workflows.

## Files Created

- `.github/workflows/ci.yml` - CI workflow (typecheck, test, build)
- `.github/workflows/deploy.yml` - Deployment workflow (with health checks)
- `.github/DEPLOYMENT_GUIDE.md` - Detailed deployment documentation

## Setup Steps

### 1. Configure Repository Variables

Navigate to **Settings > Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `REGISTRY` | `registry.wouters.dev` | Your Docker registry |
| `DEPLOY_PATH` | `/path/to/app` | Path on VPS where docker-compose.yml is |
| `APP_URL` | `your-app.com` | Your app's public URL |

### 2. Configure Repository Secrets

Navigate to **Settings > Secrets and variables > Actions > Secrets** and add:

| Secret | Value | How to Get |
|--------|-------|-----------|
| `DOCKER_USERNAME` | `your-username` | Docker registry username |
| `DOCKER_PASSWORD` | `your-token` | Docker registry password/token |

```bash
# Set via CLI
gh secret set DOCKER_USERNAME --body "your-username"
gh secret set DOCKER_PASSWORD --body "your-password"
```

### 3. Create Production Environment

Navigate to **Settings > Environments** and create:

#### Environment: `production`

**Deployment branches:**
- Allow deployments from: `Selected branches`
- Selected branches: `main`

**Environment Secrets:**

| Secret | Value | How to Get |
|--------|-------|-----------|
| `SSH_PRIVATE_KEY` | PEM private key | `cat ~/.ssh/id_rsa` |
| `VPS_HOST` | `your-vps.com` | Your VPS IP or hostname |
| `VPS_USER` | `deploy` | SSH username on VPS |

```bash
# Set via CLI
gh secret set SSH_PRIVATE_KEY --body "$(cat ~/.ssh/id_rsa)" --env production
gh secret set VPS_HOST --body "your-vps.com" --env production
gh secret set VPS_USER --body "deploy" --env production
```

### 4. Prepare VPS

#### Create Deployment User

```bash
# SSH to VPS
ssh root@your-vps.com

# Create deployment user
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# Create SSH directory
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy chmod 700 /home/deploy/.ssh
```

#### Add SSH Public Key to VPS

```bash
# On your local machine
cat ~/.ssh/id_rsa.pub | ssh root@your-vps.com \
  'cat >> /home/deploy/.ssh/authorized_keys && chown deploy:deploy /home/deploy/.ssh/authorized_keys'
```

#### Verify SSH Access

```bash
# Should work without password
ssh deploy@your-vps.com 'echo "SSH access OK"'
```

#### Docker Login Configuration

Add Docker credentials to VPS (for docker compose pull):

```bash
ssh deploy@your-vps.com
docker login registry.wouters.dev -u your-username -p your-password
```

### 5. Add Health Check Endpoint

Your app needs a `/health` endpoint for deployment health checks:

```typescript
// Example in TanStack Start
export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
```

Or for a simpler check:
```typescript
// Check database connection
export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.select().from(activity).limit(1).execute();
          return new Response("OK");
        } catch {
          return new Response("Error", { status: 500 });
        }
      },
    },
  },
});
```

### 6. Prepare docker-compose.yml on VPS

Create `/path/to/app/docker-compose.yml`:

```yaml
version: '3.8'

services:
  alt:
    image: registry.wouters.dev/alt:latest
    container_name: alt-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./sqlite.db
    volumes:
      - ./sqlite.db:/app/sqlite.db
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 7. Test CI Pipeline

```bash
# Push to main (or open PR)
git push origin main

# Watch workflow
gh run list --repo owner/repo

# View logs
gh run view <run-id> --log
```

### 8. Test Deployment (Optional)

**Manual trigger:**

1. Go to **Actions** tab
2. Select **Deploy to Production**
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

**Or push to main:**
```bash
git push origin main
# CI runs (typecheck, test, build)
# Deploy workflow starts automatically
```

### 9. Monitor Deployments

**GitHub UI:**
- Actions tab → Workflow runs
- Settings > Environments > production → Deployment history
- Releases page → Deployment status per release

**CLI:**
```bash
gh deployment list
gh run list --workflow deploy.yml
gh run view <run-id> --log
```

## Verification Checklist

- [ ] Repository variables configured (REGISTRY, DEPLOY_PATH, APP_URL)
- [ ] Repository secrets configured (DOCKER_USERNAME, DOCKER_PASSWORD)
- [ ] Production environment created
- [ ] Environment secrets configured (SSH_PRIVATE_KEY, VPS_HOST, VPS_USER)
- [ ] Deployment user created on VPS
- [ ] SSH public key added to VPS
- [ ] SSH access verified
- [ ] Docker registry credentials on VPS
- [ ] docker-compose.yml prepared on VPS
- [ ] Health check endpoint added to app
- [ ] CI workflow tested
- [ ] Deployment workflow tested

## First Deployment

1. **Verify everything is set up** - Check all checkboxes above
2. **Make a test commit**
   ```bash
   git commit --allow-empty -m "test: CI/CD workflow"
   git push origin main
   ```
3. **Watch CI workflow**
   - Should run typecheck, test, build
   - Image should be pushed to registry
4. **Manual deploy** (if auto-deploy not enabled)
   - Go to Actions → Deploy to Production
   - Click Run workflow
5. **Check deployment**
   ```bash
   curl https://your-app.com/health
   ```

## Troubleshooting

### Workflow not showing?
- `.github/workflows/` files might not be committed
- Try: `git add .github/workflows && git commit -m "add workflows"`

### Secrets not working?
- Make sure they're in the right place (repo vs environment)
- Try: `gh secret list` to verify they exist

### SSH fails?
- Test: `ssh -i ~/.ssh/id_rsa deploy@your-vps.com 'echo OK'`
- Check: SSH key in GitHub is same as on VPS

### Docker login fails?
- Test: `ssh deploy@your-vps.com 'docker login registry.wouters.dev'`
- Verify credentials are correct

### Health check fails?
- Check app is running: `docker ps`
- Check endpoint: `curl http://localhost:3000/health`
- Check logs: `docker compose logs alt`

## Next Steps

1. Commit workflows: `git add .github && git commit -m "add github actions workflows"`
2. Push: `git push origin main`
3. Monitor first CI run in Actions tab
4. Trigger first deployment
5. Monitor deployment in Actions and environment history
6. Celebrate! 🎉

## Useful Commands

```bash
# View all workflows
gh workflow list

# Trigger workflow manually
gh workflow run deploy.yml

# View recent runs
gh run list --branch main

# View specific run
gh run view <run-id> --log

# View environment deployments
gh api repos/owner/repo/environments/production/deployments

# Check secrets
gh secret list

# Edit secret
gh secret set DOCKER_PASSWORD --body "new-password"
```

## Support

For issues or questions:
- Check `.github/DEPLOYMENT_GUIDE.md` for detailed documentation
- Check GitHub Actions logs for specific error messages
- Review SSH configuration: `ssh -v deploy@vps.com`
