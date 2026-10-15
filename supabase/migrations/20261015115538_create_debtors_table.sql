/*
# Create debtors table for CrediLedger AI (single-tenant, no auth)

1. New Tables
- `debtors`
  - `id` (uuid, primary key)
  - `name` (text, not null) — merchant/customer name
  - `phone` (text, not null) — customer phone number
  - `balance` (numeric, default 0) — outstanding credit amount
  - `risk_status` (text, default 'green') — AI risk status: green, yellow, red
  - `last_transaction` (text) — description of last transaction
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
2. Security
- Enable RLS on `debtors`.
- Allow anon + authenticated full CRUD because this is a single-tenant app with no sign-in.
3. Indexes
- Index on `name` for search performance.
*/

CREATE TABLE IF NOT EXISTS debtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  balance numeric NOT NULL DEFAULT 0,
  risk_status text NOT NULL DEFAULT 'green',
  last_transaction text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_debtors" ON debtors;
CREATE POLICY "anon_select_debtors" ON debtors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_debtors" ON debtors;
CREATE POLICY "anon_insert_debtors" ON debtors FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_debtors" ON debtors;
CREATE POLICY "anon_update_debtors" ON debtors FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_debtors" ON debtors;
CREATE POLICY "anon_delete_debtors" ON debtors FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_debtors_name ON debtors (name);
