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
- Trade analytics page with account-wise performance and trade history
- Responsive UI for desktop, tablet, and mobile devices
- Sticky sidebar/header layout and mobile burger menu

## Tech Stack

### Frontend
- React
- Vite
- React Router
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
- full trade history table
- account-wise performance chart bars

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

## Future Enhancements

- Add real charts with Chart.js or Recharts
- Add advanced filters for trade analytics
- Add dark/light theme persistence improvements
- Add export of reports to CSV/PDF
- Add multi-user permissions

## License

This project is for personal and educational use.

## Author

Saqlain Mujtaba