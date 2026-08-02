# WealthPulse

WealthPulse is a comprehensive, privacy-first personal finance tracker. It allows you to track all your investments, credit cards, insurance policies, and bank accounts in one centralized, highly customizable dashboard.

## Features
- **Total Customizability:** Define your own asset categories and custom fields for each category.
- **Investment Tracking:** Automatically records monthly snapshots of your portfolio to generate a dynamic "Net Worth Trend" graph.
- **Credit Card Matrix:** Compare annual fees, milestones, and reward values side-by-side in a dedicated grid view.
- **Privacy First:** Data is stored strictly locally in an SQLite database. Your financial data never leaves your machine.
- **Excel Export:** One-click export of all your financial data and monthly trends to a multi-sheet Excel file.
- **Dark Theme UI:** A beautiful, responsive, glassmorphism interface out of the box.

## Tech Stack
- **Frontend:** React (Vite), Chart.js
- **Backend:** Node.js, Express
- **Database:** SQLite (powered by `sql.js`)

## Documentation
- [Setup Guide](docs/SETUP_GUIDE.md) - Instructions to get the app running on your machine.
- [Project Structure](docs/PROJECT_STRUCTURE.md) - Overview of the codebase for developers.
- [Database Schema](docs/DATABASE_SCHEMA.md) - Deep dive into the Entity-Attribute-Value (EAV) data model used.
