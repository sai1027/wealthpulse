# Setup Guide

Follow these steps to run WealthPulse locally on your machine.

## Prerequisites
- **Node.js**: v18 or higher recommended.
- **npm**: Node Package Manager (comes bundled with Node.js).

## 1. Installation

1. **Install Root Dependencies**
   From the root directory, install the packages required to run the development server concurrently:
   ```bash
   npm install
   ```

2. **Install Client Dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

3. **Install Server Dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

## 2. Initializing the Database

Before starting the server, you need to seed the local SQLite database. This creates the database file and pre-fills it with the default categories (Stocks, Mutual Funds, Credit Cards, etc.) and a default admin user.

Run the following command from the root directory:
```bash
cd server
npm run seed
cd ..
```
*Note: This creates a file at `server/data/wealthpulse.db`.*

## 3. Running the App

To start both the backend API server and the frontend React application simultaneously, run the following from the root directory:
```bash
npm run dev
```

The application will now be running at:
- **Frontend App:** `http://localhost:5173`
- **Backend API:** `http://localhost:3001`

Open your browser to the frontend URL. 

### Default Credentials
- **Username:** `admin`
- **Password:** `admin`

*(You can change your password immediately in the Settings tab).*
