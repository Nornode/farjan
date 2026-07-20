# Check Scraper Health

Verify the finferries.fi scraper is working correctly.

1. Start the server if not running (`cd server && node src/index.js`)
2. Hit the health endpoint: `curl -s http://localhost:3000/api/health | jq .`
3. Fetch the ferry registry: `curl -s http://localhost:3000/api/ferries | jq '.ferries | length'`
4. Test a specific timetable fetch: `curl -s http://localhost:3000/api/timetable/skaldo | jq '{valid: .validFrom, departures: (.island.departures | length)}'`

Report:
- Whether the scraper can reach finferries.fi
- How many ferries are in the registry
- Whether Skåldö timetable has valid departure data
- Any errors or warnings in the response
