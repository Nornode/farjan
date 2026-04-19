# Deployment Checklist: Stateless Container

Use this checklist before deploying Färjan to production.

## Pre-Deployment

- [ ] Sitemap is current with all ferries
  ```bash
  npm run generate-sitemap  # from client/
  cat client/public/sitemap.xml | grep -c "<loc>"  # should match ferry count + 1
  ```

- [ ] Ferry-specific routes work
  ```bash
  ./rebuild.sh
  # After container starts:
  curl http://localhost:3000/barosund -I | grep "Content-Type"  # should be text/html
  curl http://localhost:3000/metadata -I | grep "Location"     # should redirect
  ```

- [ ] Meta tags are dynamic
  ```bash
  curl http://localhost:3000/barosund | grep "<title>"       # should contain "Barösund"
  curl http://localhost:3000/ | grep "<title>"               # should contain "Skåldö"
  ```

- [ ] Sitemap is served
  ```bash
  curl http://localhost:3000/sitemap.xml | head -5  # should be XML
  ```

- [ ] Robots.txt is served
  ```bash
  curl http://localhost:3000/robots.txt | grep -i "sitemap"  # should show sitemap URL
  ```

## Deployment Steps

1. **Pull latest code**
   ```bash
   git pull origin main
   ```

2. **Verify ferry registry is current**
   ```bash
   ls -la data/ferries.json
   ```

3. **Regenerate sitemap (if new ferries added)**
   ```bash
   npm run generate-sitemap
   ```

4. **Test locally**
   ```bash
   ./rebuild.sh
   # ... run checks above ...
   ```

5. **Push to registry**
   ```bash
   docker tag farjan:latest myregistry/farjan:$(date +%Y%m%d)
   docker push myregistry/farjan:latest
   docker push myregistry/farjan:$(date +%Y%m%d)
   ```

6. **Deploy container**
   ```bash
   kubectl apply -f deployment.yaml  # or your deployment method
   ```

7. **Verify in production**
   ```bash
   curl https://farjan.lagus.net/sitemap.xml | grep -c "<loc>"
   curl https://farjan.lagus.net/api/health
   ```

## Stateless Container Guarantees

✅ **No setup overhead** — Container starts in < 30 seconds  
✅ **Scalable** — Unlimited replicas, identical behavior  
✅ **Portable** — Works anywhere: Docker, Kubernetes, Cloud Run, etc.  
✅ **Reproducible** — Same image = same sitemap always  
✅ **Fast updates** — New ferries appear after next rebuild  

## Monitoring

Check these metrics regularly:

```bash
# Container health (endpoint auto-checked every 30s)
curl https://farjan.lagus.net/api/health | jq '.status'

# Sitemap freshness (URL count)
curl https://farjan.lagus.net/sitemap.xml | grep -c "<loc>"

# Check for any errors
kubectl logs -l app=farjan | grep -i error
```

## Rollback

If something breaks:

```bash
# Rollback to previous image
kubectl rollout undo deployment/farjan

# Or manually deploy previous version
docker pull myregistry/farjan:20260419
docker run ...
```

---

**Remember:** In stateless containers, all state must come from:
- Build-time generation (sitemap.xml ✓)
- Runtime API calls (ferry list ✓)
- External storage (data/ volume ✓)

Never rely on container filesystem for persistent data!
