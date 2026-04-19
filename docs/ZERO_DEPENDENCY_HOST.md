# Zero-Dependency Host Deployment

The Docker host requires NO Node.js, npm, or build dependencies. All build steps happen inside Docker.

## Workflow

### **Host Prerequisites**
- ✅ Docker (only requirement)
- ✅ Bash shell
- ✅ Git (to pull code)

### **Build Process**

```bash
./rebuild.sh
```

Here's what happens:

1. **Sitemap generation** (if ferries.json exists)
   - Spins up temporary `node:20-alpine` container
   - Mounts data/ferries.json and scripts/ directory
   - Runs: `node scripts/generate-sitemap.js`
   - Outputs to: `client/public/sitemap.xml`
   - Container removed after

2. **Docker build**
   - Reads Dockerfile
   - Builds Node.js image with compiled React app + pre-generated sitemap
   - No external dependencies used

3. **Container start**
   - Runs Express server
   - Serves React app + sitemap.xml as static files

## How It Works

### **rebuild.sh**
```bash
# Uses temporary Docker container for sitemap generation
docker run --rm \
  -v "$(pwd)/data:/data" \
  -v "$(pwd)/scripts:/scripts" \
  -v "$(pwd)/client/public:/public" \
  node:20-alpine \
  sh -c "cd /scripts && node generate-sitemap.js"

# Then builds the main image
docker build -t farjan .
```

### **Dockerfile**
- Compiles React client with `npm install && npm run build`
- COPYs pre-generated `sitemap.xml` into `/app/client/dist`
- No npm/node needed on host after build

## Files Generated

| File | Generated Where | Purpose |
|------|-----------------|---------|
| `client/public/sitemap.xml` | Host (temp Docker container) | Served as static file |
| `client/dist/index.html` | Docker build phase | React app bundle |
| `client/dist/sitemap.xml` | Docker build phase | Copied from public/ |

## When Sitemap Regenerates

**Before each deploy:**
```bash
./rebuild.sh
```

1. Checks if `data/ferries.json` exists
2. If yes: Generates fresh sitemap using temp Docker container
3. If no: Skips (sitemap will be regenerated next time ferries.json is updated)
4. Builds Docker image with sitemap baked in

## Zero-Dependency Guarantee

✅ Host has NO:
- Node.js
- npm
- Python
- Ruby
- Any build tools

✅ Host ONLY needs:
- Docker
- Bash
- Git

## Troubleshooting

**"docker: command not found"**
- Install Docker on your host

**"Sitemap generation failed"**
- Docker container has `node:20-alpine` - should always work
- Check: `docker run --rm node:20-alpine node --version`
- Verify: `data/ferries.json` exists and is valid JSON

**Sitemap not updating**
- Run: `./rebuild.sh` again
- Check: `client/public/sitemap.xml` was regenerated
- Verify: `docker build -t farjan .` creates new image

## Deployment

```bash
# On host (no dependencies needed)
git pull origin main
./rebuild.sh

# Docker image now contains:
# - Compiled React app
# - Fresh sitemap.xml
# - All static assets

# Deploy the image
docker push myregistry/farjan:latest
```

## Performance

- Sitemap generation: ~2-5 seconds (temp Docker container)
- Docker build: ~30-60 seconds (normal build time)
- Total rebuild: ~1-2 minutes

## Security Benefits

✅ Host has minimal attack surface (no npm, no build tools)
✅ Build process isolated in containers
✅ Reproducible builds (same Docker image always)
✅ No credentials/secrets on host
