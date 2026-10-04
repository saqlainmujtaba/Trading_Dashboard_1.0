# Personal Trading Dashboard (Next.js)

This is a standalone Next.js version of the trading dashboard. It includes the dashboard UI and its Express/MongoDB API in `server/`; the original Vite project remains unchanged in the repository's `client/` and `server/` folders. In production, the Express API is invoked through a Next.js route handler, so both the UI and API can deploy as Vercel functions.

## Requirements

- Node.js 18.18 or later
- npm
- MongoDB, local or Atlas

## Install and run

From this directory:

```bash
npm install
npm run dev
```

This starts the Next.js app at `http://localhost:3000` and the local Express API at `http://localhost:5000`. Set up MongoDB and the server environment before using authentication or dashboard data.

Create `server/.env` with:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/personal-trading-dashboard
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:3000
```

The frontend uses the local API at `http://localhost:5000/api` in development and the same-origin `/api` route in production. Only set `NEXT_PUBLIC_API_URL` in `.env.local` if you intentionally use a separate API host.

## Deploy to Vercel

1. Import the repository into Vercel and set the project **Root Directory** to `nextjs`.
2. Use the default Next.js framework settings and build command (`npm run build`).
3. Create a MongoDB Atlas database and allow Vercel's deployment to reach it.
4. Add these Vercel project environment variables for each deployment environment:
   - `MONGO_URI` — the MongoDB Atlas connection string.
   - `JWT_SECRET` — a long, random secret used to sign sessions.
   - `CLIENT_URL` — your canonical deployed site origin, such as `https://your-project.vercel.app` (and any custom domain, comma-separated).
   - `NEXT_PUBLIC_SHARE_BASE_URL` — optional canonical site origin used in generated share links; leave unset to use the current site origin.
5. Deploy. Leave `NEXT_PUBLIC_API_URL` unset to use the same deployment for the frontend and API.

Vercel supplies preview deployment hostnames automatically. The API permits those Vercel hostnames and the origins listed in `CLIENT_URL`. Do not commit `.env`, `.env.local`, or production secrets.

### Sharing dashboard results

Use the **Share** buttons in the current accounts, trade history, payouts, and monthly payout summary sections. You can share account lists/details, an individual trade (including entry, exit, lot size, stop loss, and take profit), trade history, payout history, and monthly summaries. Download a PNG or create a public read-only link with an Open Graph preview image. Anyone with the link can view the saved snapshot until you revoke it. The trader's name is shown in the page and preview. The Next.js app uses its current site origin for links unless `NEXT_PUBLIC_SHARE_BASE_URL` is set. The original Vite frontend can create preview links by setting `VITE_SHARE_BASE_URL` to this deployed Next.js site's URL; both apps must use the same MongoDB database.

If signed-in dashboard requests fail, the app now displays the API's configuration error instead of silently showing empty data. Confirm that `MONGO_URI` points to the same Atlas database used by the original app, `JWT_SECRET` matches the value used to issue the session, and Atlas network access permits Vercel.

For a traditional Node.js deployment instead, configure the same values in `server/.env`; `npm run dev` starts both services locally.

## Checks

```bash
npm test
npm run test --workspace server
npm run build
```
