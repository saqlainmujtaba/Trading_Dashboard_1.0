# Personal Trading Dashboard

A full-stack dashboard for managing prop-firm trading accounts, planned accounts, payouts, and trade history. The app helps traders monitor account performance, calculate trade profit/loss, track payouts, and review analytics through a clean responsive interface.

## Features

- User authentication and protected dashboard access
- Manage current trading accounts
- Track planned accounts for future funding
- Add, edit, and delete trades
- Automatic profit/loss calculation based on entry price, exit price, lot size, direction, and pair
- Risk amount tracking in USD
- Payout management tied to existing accounts
- Portfolio overview by prop firm
- Trade analytics with cumulative P/L and account performance charts
- Trade filters for search, date range, account, pair, direction, and result
- CSV and PDF exports for the currently filtered trade report
- Trade-history imports from CSV and modern `.xlsx` exports, with preview and account mapping
- Persistent light/dark theme with system preference and cross-tab synchronization
- User-scoped dashboard data and account ownership checks
- Responsive UI for desktop, tablet, and mobile devices
- Sticky sidebar/header layout and mobile burger menu

## Tech Stack

### Frontend
- React
- Vite
- React Router
- Recharts
- jsPDF
- Axios

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

## Project Structure

```text
Personal Trading Dashboard/
├── client/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── mobile/
│   ├── App.js
│   ├── app.json
│   └── package.json
├── server/
│   ├── src/
│   └── package.json
├── .gitignore
├── README.md
└── package.json
```

## Prerequisites

Before running the app, make sure you have installed:

- Node.js (v18 or later recommended)
- npm
- MongoDB running locally or via MongoDB Atlas

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/saqlainmujtaba/Trading_Dashboard_1.0.git
cd "Personal Trading Dashboard"
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Install backend dependencies

```bash
cd ../server
npm install
```

## Environment Configuration

Create a `.env` file in the `server` directory if needed for runtime configuration such as:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/personal-trading-dashboard
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```

For deployment, set `NODE_ENV=production`, a strong `JWT_SECRET`, your MongoDB Atlas connection string as `MONGO_URI`, and the deployed frontend origin as `CLIENT_URL`. `CLIENT_URL` can contain comma-separated origins if you need to allow more than one. Do not commit production secrets.

## Run the Application

### Start backend

```bash
cd server
npm run dev
```

### Start frontend

```bash
cd client
npm run dev
```

Then open the frontend URL shown by Vite in the browser.

## Android App

`mobile 2.0/` is the Kotlin Android app. It packages the existing web client, preserving the web app's screens, theme, profile, analytics, account management, history import, and reports. The APK build reads the API URL from `mobile/.env`.

Install Android Studio, Android SDK Platform 36, and JDK 17. From the repository root, build the debug APK with:

```powershell
& '.\mobile 2.0\gradlew.bat' -p 'mobile 2.0' assembleDebug
```

The output is `mobile 2.0/app/build/outputs/apk/debug/app-debug.apk`. The first build packages the current web client automatically. Deploy the backend CORS update so it allows the app asset origin `https://appassets.androidplatform.net`.

The earlier Expo client remains in `mobile/` for development, but `mobile 2.0/` is the Kotlin APK target.

## Main Modules

### Dashboard
Contains summary cards and core sections for:
- current accounts
- planned accounts
- portfolio overview
- trade history
- payouts

### Analytics Page
Displays:
- total trade P/L
- average trade value
- best-performing account
- cumulative P/L and account performance charts
- selectable line, bar, area, and pie visualizations where appropriate
- searchable, filterable trade history
- CSV and PDF report exports
- CSV and `.xlsx` history import with column matching for common MT5, cTrader, and MatchTrader exports

### Backend API
The server exposes endpoints for:
- authentication
- dashboard statistics
- account management
- planned account management
- trade records
- payout records

## Data Model Highlights

### Account
- name
- propFirm
- fundedAmount
- balance
- startingBalance
- profitPercent
- status
- purchaseDate

### Planned Account
- company
- size
- type
- cost
- priority
- status

### Trade
- date
- account
- propFirm
- pair
- buySell
- entryPrice
- exitPrice
- lotSize
- risk
- pnl
- rr
- notes

### Payout
- date
- account
- amount
- method
- status

## Notes

- Risk is tracked as a USD amount, not percentage.
- Profit and loss are calculated automatically using trade inputs.
- Payouts are linked to existing accounts instead of being entered as separate manual account names.
- Delete actions include confirmation prompts before removal.

## Tests

Run the server-side ownership checks with:

```bash
npm test --workspace server
```

## License

This project is for personal and educational use.

## Author

Saqlain Mujtaba