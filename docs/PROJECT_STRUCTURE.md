# Project Structure

WealthPulse is structured as a monorepo containing a React frontend (`client/`) and a Node.js/Express backend (`server/`). The root directory acts as a coordinator to start both services concurrently.

## Directory Tree

```text
wealth-tracker/
├── package.json          # Root package.json (uses concurrently to run the dev script)
├── .gitignore            # Root ignore rules for node_modules, .env, and server/data/
├── README.md             # Project overview
├── docs/                 # Documentation directory
│
├── client/               # React Frontend (built with Vite)
│   ├── index.html        
│   ├── vite.config.js    # Vite configuration (proxies /api requests to backend port 3001)
│   └── src/
│       ├── api.js        # API client wrapper formatting requests to the backend
│       ├── App.jsx       # Main App component, Router, and Authentication Context
│       ├── index.css     # Global styles and design system (Dark glassmorphism theme)
│       ├── main.jsx      # React entry point
│       └── pages/        # React route components
│           ├── Dashboard.jsx        # Overview stats and charts
│           ├── CategoryPage.jsx     # Generic template for Investments/Insurance/Banks
│           ├── CreditCardsPage.jsx  # Specialized Matrix view for credit cards
│           └── SettingsPage.jsx     # Category, Field, and Account management
│
└── server/               # Node.js + Express Backend
    ├── package.json      
    ├── index.js          # Main Express server, auth middleware, and REST API routes
    ├── db.js             # SQLite database initialization (using sql.js) and wrapper functions
    ├── seed.js           # Database seeding script (creates initial schema and default categories)
    └── data/             # Local SQLite database storage location (wealthpulse.db) -> Git Ignored
```

## Architecture Flow
- **Frontend (Client):** A Single Page Application built with React. It communicates with the backend exclusively via REST APIs under the `/api/*` prefix. It manages session state locally via Context.
- **Backend (Server):** An Express.js API. It handles user authentication (using `express-session` and `bcryptjs`), serves CRUD endpoints for the financial items, handles automatic background processes (like monthly snapshots), and aggregates data for the frontend dashboard.
- **Persistence:** A strictly local, file-based SQLite database powered by `sql.js`. The database file is generated dynamically at `server/data/wealthpulse.db`.
