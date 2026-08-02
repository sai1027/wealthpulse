# Database Schema

WealthPulse utilizes an **Entity-Attribute-Value (EAV)** model within a local SQLite database. This architecture is chosen specifically to satisfy the core requirement of the app: **total user customizability**. Users can create arbitrary categories (Entities) and attach arbitrary fields (Attributes) to them, without requiring backend schema migrations.

## Core Tables

### 1. `users`
Stores authenticated users and their hashed credentials.
- `id` (INTEGER PK)
- `username` (TEXT UNIQUE)
- `display_name` (TEXT)
- `password_hash` (TEXT)
- `created_at` (DATETIME)

### 2. `categories`
Defines a high-level asset bucket (e.g., "Stocks", "Credit Cards", "Bank Accounts").
- `id` (INTEGER PK)
- `user_id` (INTEGER) - FK pointing to `users`
- `name` (TEXT) - Display name
- `slug` (TEXT) - URL-friendly identifier
- `category_type` (TEXT) - Used by frontend to determine the view template (e.g., 'investment', 'credit_card', 'insurance', 'bank')
- `icon` (TEXT) - Emoji or icon string
- `sort_order` (INTEGER)

### 3. `field_definitions` (Attributes)
Defines the structure/schema of a specific category. A category can have infinite fields.
- `id` (INTEGER PK)
- `category_id` (INTEGER) - FK pointing to `categories`
- `field_name` (TEXT) - Internal identifier (e.g., 'invested_value', 'annual_fee')
- `field_label` (TEXT) - UI Display name (e.g., 'Invested Value (₹)')
- `field_type` (TEXT) - Input formatting rule ('text', 'currency', 'number', 'percent', 'date', 'select')
- `options` (TEXT) - JSON string array if `field_type` is 'select'
- `is_required` (INTEGER) - Boolean
- `is_sensitive` (INTEGER) - Boolean (If true, frontend renders it masked like a password)
- `is_visible_in_summary` (INTEGER) - Boolean (If true, it appears as a column in the main data tables)
- `sort_order` (INTEGER)

### 4. `items` (Entities)
A specific instance of an asset within a category (e.g., "HDFC Regalia Card", "Apple Stock").
- `id` (INTEGER PK)
- `category_id` (INTEGER) - FK pointing to `categories`
- `user_id` (INTEGER) - FK pointing to `users`
- `name` (TEXT) - Display name of the item
- `description` (TEXT)
- `created_at` / `updated_at` (DATETIME)

### 5. `item_values` (Values)
The actual user data. It binds a specific field value to a specific item.
- `id` (INTEGER PK)
- `item_id` (INTEGER) - FK pointing to `items`
- `field_id` (INTEGER) - FK pointing to `field_definitions`
- `value` (TEXT) - Stored uniformly as a string (parsed by frontend based on `field_type`)

### 6. `monthly_snapshots`
Time-series analytics table for generating the Net Worth Trend graph. 
- `id` (INTEGER PK)
- `item_id` (INTEGER) - FK pointing to `items`
- `month` (TEXT) - Format: 'YYYY-MM'
- `invested_value` (REAL)
- `current_value` (REAL)
- `notes` (TEXT)

*Note: As of the latest update, rows in this table are automatically generated/updated when the user creates or modifies an item in an investment category, based on its `invested_value` and `current_value` fields.*
