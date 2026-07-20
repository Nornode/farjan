# Start Development Servers

Start the local development environment for Färjan.

1. Check that dependencies are installed in both `server/` and `client/` (run `npm install` if `node_modules` is missing)
2. Start the Express backend server: `cd server && npm run dev`
3. Start the Vite frontend dev server: `cd client && npm run dev`

Run both servers in background tasks. Confirm they're healthy by checking:
- Backend: `curl -s http://localhost:3000/api/health`
- Frontend: Vite output shows "ready" on port 5173

Report the URLs to the user when ready.
