# Add a New Feature

Guide for adding features to Färjan. Analyze the user's request and implement it following project conventions.

## Key patterns to follow:

**New API endpoint:**
- Add route in `server/src/api/routes.js`
- Keep rate limiting consistent (60 req/min)
- Return JSON with appropriate error codes

**New frontend page:**
1. Create `client/src/pages/PageName.jsx`
2. Add `<Route>` in `client/src/App.jsx`
3. Add `<NavLink>` in `client/src/components/Nav.jsx`
4. Remember layout constraint: flex children need `overflow-y-auto` + parent needs `min-h-0`

**New hook:**
- Place in `client/src/hooks/`
- Follow naming: `useFeatureName.js`
- Keep data fetching patterns consistent with `useFerryData.js`

**Styling:**
- Tailwind utility classes only
- Support dark mode: use `dark:` variants
- Mobile-first: test at 375px width

## After implementation:
- Start dev servers and verify the feature works in browser
- Check both light and dark themes
- Verify mobile responsiveness
- Ensure no console errors
