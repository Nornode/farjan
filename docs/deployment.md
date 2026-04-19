# Stateless Container Deployment

This guide explains how Färjan is optimized for stateless containerized deployment (e.g., Docker, Kubernetes).

## Sitemap Generation Strategy

**Why build-time only?**
- ✅ Fast: No runtime overhead
- ✅ Deterministic: Same build = same sitemap
- ✅ Stateless: No container needs to maintain state
- ✅ Safe: Pre-generated, no API dependency during initialization

**How it works:**

1. **Local rebuild (before Docker build)**
   ```bash
   ./rebuild.sh
   ```
   This regenerates `client/public/sitemap.xml` from the current `data/ferries.json` registry

2. **Docker build**
   - The Dockerfile COPYs the pre-generated `client/public/sitemap.xml`
   - Sitemap is baked into the image as a static file
   - No runtime generation needed

3. **Container runtime**
   - Sitemap is served as static file from `/client/dist/sitemap.xml`
   - Search engines fetch it from `https://farjan.lagus.net/sitemap.xml`

## Deployment Checklist

Before pushing a new image to production:

```bash
# 1. Ensure ferry registry is current
#    (usually happens during normal operation)
ls -la data/ferries.json

# 2. Regenerate sitemap & rebuild image
./rebuild.sh

# 3. Verify sitemap includes all ferries
cat client/public/sitemap.xml | grep "<loc>" | wc -l
# Should show: (ferries count + 1)

# 4. Tag and push image
docker tag farjan:latest myregistry.azurecr.io/farjan:latest
docker push myregistry.azurecr.io/farjan:latest

# 5. Deploy container
kubectl apply -f deployment.yaml  # or docker pull & run
```

## Adding New Ferries

When new ferries are added to Finferries:

1. Server's scraper updates `data/ferries.json` automatically
2. On next rebuild, `data/ferries.json` is newer → sitemap regenerates
3. New ferry URLs appear in next deployed image

**Note:** If you manually add ferries to `ferries.json`, run `npm run generate-sitemap` to update the sitemap immediately.

## Monitoring

Check container health and sitemap freshness:

```bash
# Health check (built into Dockerfile)
curl http://localhost:3000/api/health

# Verify sitemap is served
curl http://localhost:3000/sitemap.xml | head -20

# Count URLs in sitemap
curl http://localhost:3000/sitemap.xml | grep -c "<loc>"
```

## Stateless Benefits

| Aspect | Benefit |
|--------|---------|
| Scaling | New containers start instantly; no runtime setup needed |
| Updates | Image updates = new sitemap automatically |
| Rollbacks | Previous image has matching sitemap; no inconsistency |
| State | No reliance on external state; container is self-contained |

## Troubleshooting

**Sitemap is missing new ferries:**
```bash
# Regenerate locally and rebuild
npm run generate-sitemap
./rebuild.sh
```

**Sitemap is outdated on live container:**
```bash
# Rebuild the image with current ferries.json
./rebuild.sh

# Or manually regenerate if needed
npm run generate-sitemap
```

**Container won't start:**
Check logs for sitemap generation errors:
```bash
docker logs farjan | grep sitemap
```
