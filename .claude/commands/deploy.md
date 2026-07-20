# Prepare for Deployment

Pre-deployment checklist for Färjan. Do NOT run Docker or rebuild.sh — just prepare and validate.

1. **Check for uncommitted changes:** `git status`
2. **Verify client builds cleanly:** `cd client && npm run build`
3. **Generate sitemap:** `cd client && npm run generate-sitemap` (if ferry routes changed)
4. **Validate API endpoints match docs:** Compare `server/src/api/routes.js` with `docs/api.md`
5. **Check environment variables:** Verify `.env` has required vars documented in CLAUDE.md
6. **Review recent commits:** `git log --oneline -10` — summarize what changed since last deploy

Report a summary of what's ready and flag any issues. Remind the user to run `./rebuild.sh` manually when they're ready to deploy.
