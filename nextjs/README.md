# Personal Trading Dashboard (Next.js)

This is a standalone Next.js version of the trading dashboard. It includes the dashboard UI and its Express/MongoDB API in `server/`; the original Vite project remains unchanged in the repository's `client/` and `server/` folders.

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

This starts the Next.js app at `http://localhost:3000` and the API at `http://localhost:5000`. Set up MongoDB and the server environment before using authentication or dashboard data.

Create `server/.env` with:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/personal-trading-dashboard
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:3000
```

The frontend defaults to `http://localhost:5000/api`. To use another API URL, set `NEXT_PUBLIC_API_URL` in a `.env.local` file in this directory and restart Next.js.

For a production deployment, configure a strong `JWT_SECRET`, your MongoDB Atlas connection string, and the deployed frontend origin in `server/.env`. Build and start the Next.js app with `npm run build` and `npm run start`; the start script runs the API alongside Next.js.

## Checks

```bash
npm test
npm run test --workspace server
npm run build
```
