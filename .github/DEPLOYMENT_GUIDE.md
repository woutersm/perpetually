# Idiomatic VPS Deployment with GitHub Actions

This guide explains the recommended (idiomatic) way to deploy to a VPS using GitHub Actions.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflows                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CI Workflow (.github/workflows/ci.yml)                    │
│  ├─ typecheck                                              │
│  ├─ test                                                   │
│  └─ build (push to registry)                               │
│                                                             │
│  Deploy Workflow (.github/workflows/deploy.yml)            │
│  ├─ build (rebuild if needed)                              │
│  └─ deploy (environment-protected)                         │
│     ├─ SSH to VPS                                          │
│     ├─ Pull latest image                                   │
│     ├─ Deploy with docker compose                          │
│     ├─ Health check                                        │
│     └─ Update deployment status                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
    ┌─────────────┐              ┌─────────────────────┐
    │   Registry  │              │  VPS (Production)   │
    │  (Docker)   │              │  ┌────────────────┐ │
    │             │◄─────────────┤──│ docker compose │ │
    └─────────────┘              │  └────────────────┘ │
                                 └─────────────────────┘
```

## Key Idiomatic Principles

### 1. **Separate CI and Deployment Workflows**
- `ci.yml` - Runs on all pushes and PRs (typecheck, test, build)
- `deploy.yml` - Only runs on successful builds to main
- Separates concerns and allows different deployment strategies

### 2. **GitHub Environments for Protection**
```yaml
environment:
  name: production
  url: https://your-app.com
```

Benefits:
- ✅ Environment-specific secrets
- ✅ Required reviewers (approval gate for production)
- ✅ Deployment history in GitHub UI
- ✅ Tracked in pull requests and releases

### 3. **Deployment Status API**
Uses GitHub's official Deployment API to:
- Create deployment records
- Track success/failure
- Show deployment status on releases/PRs
- Maintain deployment history

### 4. **Health Checks**
```yaml
- name: Health check
  run: |
    for i in {1..30}; do
      if curl -f -s https://your-app.com/health; then
        exit 0
      fi
      sleep 2
    done
    exit 1
```

Ensures:
- ✅ Application started successfully
- ✅ All services are healthy
- ✅ Automatic rollback on failure

### 5. **SSH Best Practices**
```yaml
ssh-keyscan -t rsa -H "$VPS_HOST" >> ~/.ssh/known_hosts
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new
```

Features:
- Uses `ssh-keyscan` to add host key (no interactive prompts)
- `StrictHostKeyChecking=accept-new` for first-time connections
- `ConnectTimeout=10` to fail fast on network issues
- Verbose `-v` flag for debugging SSH issues

### 6. **Error Handling and Notifications**
```yaml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
```

- Marks deployment as failed in GitHub UI
- Posts comments on related issues/PRs
- Creates audit trail of all deployments

## Configuration Required

### Repository Variables (Settings > Variables)

```
REGISTRY              registry.wouters.dev
DEPLOY_PATH          /home/user/app
APP_URL               your-app.com
```

### Environment Secrets (Settings > Environments > production)

```
SSH_PRIVATE_KEY       (PEM format)
VPS_HOST              your-vps.com
VPS_USER              deploy
```

### Repository Secrets (Settings > Secrets)

```
DOCKER_USERNAME       your-username
DOCKER_PASSWORD       your-password
```

## Deployment Flow

### On Push to Main

1. **CI Workflow Starts**
   ```
   push to main
   └─ typecheck ✓
      └─ test ✓
         └─ build & push image ✓
   ```

2. **Automatic Deployment Triggered** (optional)
   - Can be configured to auto-deploy after successful build
   - Or manually trigger from Actions tab

3. **Deploy Workflow Runs**
   ```
   build (if needed)
   └─ deploy with environment protection
      ├─ SSH to VPS
      ├─ Pull latest Docker image
      ├─ Run docker compose up -d
      ├─ Health check (30 retries, 2s intervals)
      ├─ Update deployment status
      └─ Post notification
   ```

### Manual Deployment

1. Go to **Actions** tab
2. Select **Deploy to Production** workflow
3. Click **Run workflow**
4. Select environment: `production`
5. Click **Run workflow**

## Rollback Strategy

If deployment fails:

1. **Automatic Rollback** (manual for now)
   ```bash
   ssh deploy@your-vps.com
   cd /home/user/app
   docker compose up -d alt --force-recreate  # re-runs with previous image
   ```

2. **GitHub UI Shows Failure**
   - Deployment marked as failed
   - Previous successful deployment still visible
   - Can re-run previous deployment

## Monitoring Deployments

### In GitHub UI

1. **Environments Page**
   - Shows deployment history
   - Status of each deployment
   - Responsible person and timestamp

2. **Pull Requests**
   - Deployment status in PR
   - Link to deployment in Actions

3. **Releases**
   - Deployment history per release
   - Track what's running in production

### Command Line

```bash
# View deployments
gh deployment list --repo owner/repo

# View deployment status
gh deployment status <deployment-id> --repo owner/repo
```

## Security Best Practices

### 1. SSH Key Management
```bash
# Generate deployment key (no passphrase)
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""

# Add to VPS authorized_keys
cat ~/.ssh/deploy_key.pub | ssh user@vps 'cat >> ~/.ssh/authorized_keys'

# Add to GitHub as secret
gh secret set SSH_PRIVATE_KEY --body "$(cat ~/.ssh/deploy_key)"
```

### 2. Environment Protection
- Require approval before deploying to production
- Different credentials per environment
- Separate staging and production deployments

### 3. Secret Rotation
- Rotate Docker registry passwords regularly
- Rotate SSH keys periodically
- Use GitHub's secret scanning

### 4. Network Security
- Use SSH key authentication (not passwords)
- Configure UFW/iptables to restrict Docker registry IPs
- Use VPN or security groups where possible

## Troubleshooting

### Health Check Fails
```
✗ Health check failed after 30 attempts
```

**Solution:**
1. Check if app is actually running: `docker ps`
2. Check app logs: `docker compose logs alt`
3. Verify health check endpoint: `curl http://localhost:3000/health`
4. Increase timeout or retry count in workflow

### SSH Connection Refused
```
ssh: connect to host timeout
```

**Solution:**
1. Verify VPS_HOST is correct: `ping $VPS_HOST`
2. Check firewall: `sudo ufw status`
3. Verify SSH key: `ssh -i ~/.ssh/deploy_key user@host`
4. Check VPS_USER has SSH access

### Docker Pull Fails
```
failed to pull image
```

**Solution:**
1. Verify credentials: `docker login registry.wouters.dev`
2. Check image exists: `docker search registry.wouters.dev/alt`
3. Verify docker compose syntax
4. Check Docker registry is accessible from VPS

### Previous Deployment Still Running
```
Conflict: unable to remove image because it's in use
```

**Solution:**
- Add `--force-recreate` flag (already in workflow)
- Manually stop containers: `docker compose down`
- Check for orphaned processes: `docker ps -a`

## Advantages of This Approach

✅ **Official GitHub Support** - Uses GitHub Deployments API
✅ **Environment Protection** - Approval gates for production
✅ **Audit Trail** - Full history of who deployed what when
✅ **Health Verification** - Automatic health checks prevent bad deployments
✅ **Visibility** - Deployment status visible on releases and PRs
✅ **Scalability** - Easy to add staging, canary, or multi-region deployments
✅ **Security** - Environment-specific secrets, no hardcoded credentials
✅ **Automation** - Minimal manual steps needed
✅ **Reliability** - Retries, timeouts, error handling built-in
✅ **Community** - Standard approach used by industry

## Comparison to Legacy Approaches

| Feature | Basic SSH | Idiomatic GitHub Actions |
|---------|-----------|------------------------|
| History Tracking | ❌ None | ✅ Full audit trail |
| Environment Separation | ❌ Manual | ✅ Automatic |
| Approval Gates | ❌ No | ✅ Yes |
| Health Checks | ❌ Manual | ✅ Automatic |
| Rollback | ❌ Manual SSH | ✅ One-click from UI |
| Integration | ❌ External | ✅ Built into GitHub |
| Visibility | ❌ Low | ✅ High (PRs, Releases) |
| Scalability | ⚠️ Limited | ✅ Easy to scale |

## Next Steps

1. **Set up environments** in GitHub settings
2. **Add repository variables** (REGISTRY, DEPLOY_PATH, APP_URL)
3. **Add repository and environment secrets**
4. **Add health check endpoint** to your app (if not present)
5. **Test deployment** with a test push or manual trigger
6. **Monitor** first few deployments
7. **Set up approval requirements** for production (optional)

## Additional Resources

- [GitHub Deployments API](https://docs.github.com/en/rest/deployments)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/guides)
- [SSH Best Practices](https://docs.github.com/en/developers/overview/managing-deploy-keys)
- [Docker Compose Best Practices](https://docs.docker.com/compose/production/)
