# GitHub Actions CI/CD Setup

This project uses GitHub Actions for automated testing, building, and deployment. The workflow file is located at `.github/workflows/ci.yml`.

## Workflow Jobs

The CI/CD pipeline consists of 4 jobs that run sequentially:

### 1. **typecheck** - TypeScript Type Checking
- Runs on: `ubuntu-latest`
- Installs dependencies and runs `bun run typecheck`
- Fails if any TypeScript errors are found
- **Always runs** on push and pull requests

### 2. **test** - Unit Tests
- Runs on: `ubuntu-latest`
- Depends on: `typecheck` (only runs if typecheck passes)
- Installs dependencies and runs `bun run test`
- Fails if any tests fail

### 3. **build** - Docker Image Build & Push
- Runs on: `ubuntu-latest`
- Depends on: `test` (only runs if tests pass)
- **Only runs** on push to `main` branch (not on pull requests)
- Builds Docker image using Buildx with layer caching
- Pushes image to Docker registry with tags:
  - `latest` (for main branch)
  - `main-<short-sha>` (for commit reference)
  - `main` (branch name)

### 4. **deploy** - Deploy to VPS
- Runs on: `ubuntu-latest`
- Depends on: `build` (only runs if build succeeds)
- **Only runs** on push to `main` branch
- Connects to VPS via SSH
- Pulls latest Docker image
- Updates running containers with `docker compose up -d`
- Cleans up unused Docker resources

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Docker Registry Secrets
- **DOCKER_USERNAME**: Username for Docker registry authentication
  - Used for: Logging into `registry.wouters.dev`
  - Example: `martijnwouters`

- **DOCKER_PASSWORD**: Password/token for Docker registry authentication
  - Used for: Pushing images and pulling on VPS
  - Example: Docker registry password or token

### VPS Deployment Secrets
- **SSH_PRIVATE_KEY**: Private SSH key for VPS authentication
  - Used for: SSH access to VPS for deployment
  - Format: PEM format private key (copy entire key including `-----BEGIN PRIVATE KEY-----`)
  - Permissions: Should match the key that's authorized in `~/.ssh/authorized_keys` on VPS

- **VPS_HOST**: Hostname or IP address of the VPS
  - Example: `example.com` or `192.168.1.1`

- **VPS_USER**: SSH username for VPS
  - Example: `root` or `deploy`

## Setting Up Secrets

### Via GitHub UI
1. Go to your repository on GitHub
2. Click `Settings` → `Secrets and variables` → `Actions`
3. Click `New repository secret`
4. Enter the secret name (e.g., `DOCKER_USERNAME`)
5. Enter the secret value
6. Click `Add secret`

### Via GitHub CLI
```bash
# Replace with your actual values
gh secret set DOCKER_USERNAME --body "your_username"
gh secret set DOCKER_PASSWORD --body "your_password"
gh secret set SSH_PRIVATE_KEY --body "$(cat ~/.ssh/id_rsa)"
gh secret set VPS_HOST --body "your.vps.host"
gh secret set VPS_USER --body "root"
```

## Triggering the Workflow

The workflow automatically runs:
- On every push to the `main` branch
- On every pull request to the `main` branch

Pull requests will run **typecheck and tests only**. The build and deploy jobs only run on push to main.

### Manual Workflow Runs
You can manually trigger the workflow:
1. Go to `Actions` tab in your repository
2. Select `CI/CD Pipeline` workflow
3. Click `Run workflow`
4. Select the branch
5. Click `Run workflow`

## Monitoring & Debugging

### View Workflow Runs
1. Go to `Actions` tab in your repository
2. Click on the workflow run to see details
3. Expand each job to see logs

### Common Issues

#### Tests Failing in CI but Passing Locally
- Check Node.js/Bun version differences
- Verify environment variables are set correctly
- Check for timing-dependent tests
- Ensure all dependencies are in `bun.lock`

#### Docker Push Failures
- Verify `DOCKER_USERNAME` and `DOCKER_PASSWORD` are correct
- Ensure registry username has push permissions
- Check if registry is accessible from GitHub Actions runners

#### SSH/Deployment Failures
- Verify `SSH_PRIVATE_KEY` is correctly formatted (include header/footer)
- Ensure the public key is in VPS `~/.ssh/authorized_keys`
- Verify `VPS_HOST` and `VPS_USER` are correct
- Check VPS firewall rules allow SSH from GitHub Actions IPs

## Performance Optimization

The workflow includes several optimizations:

### Docker Layer Caching
- Uses GitHub Actions cache for Docker layers
- Significantly speeds up subsequent builds
- `cache-from: type=gha` and `cache-to: type=gha,mode=max`

### Parallel Job Setup
- Each job sets up its own environment
- Bun setup is fast (~10s)
- Dependencies are cached efficiently

## Cost Considerations

GitHub Actions provides:
- **Free tier**: 2,000 minutes/month for private repositories
- **Ubuntu runners**: $0.008/minute

Estimated monthly usage for this project:
- Typecheck: ~5 minutes per run × 20 runs = 100 minutes
- Tests: ~5 minutes per run × 20 runs = 100 minutes
- Build: ~5 minutes per run × 5 runs (main only) = 25 minutes
- Deploy: ~2 minutes per run × 5 runs = 10 minutes
- **Total**: ~235 minutes/month (within free tier)

## Comparison to Concourse

### Advantages of GitHub Actions
✅ No separate CI infrastructure needed
✅ Integrated directly in GitHub
✅ Free tier sufficient for most projects
✅ Large ecosystem of pre-built actions
✅ Better secret management

### What Changed from Concourse
- Simpler YAML format
- No need for external CI platform
- GitHub Secrets instead of Concourse credentials
- Docker Buildx instead of OCI build task
- Built-in GitHub Actions caching

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Bun GitHub Actions](https://github.com/oven-sh/setup-bun)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [GitHub Secrets Best Practices](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
