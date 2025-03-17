-- Drop the existing contacts table
DROP TABLE IF EXISTS "contacts";

-- Create contacts table with new schema
CREATE TABLE IF NOT EXISTS "contacts" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "account_name" TEXT,
  "title" TEXT,
  "mailing_street" TEXT,
  "mailing_city" TEXT,
  "mailing_state" TEXT,
  "mailing_zip" TEXT,
  "mailing_country" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "opportunity_owner" TEXT,
  "latitude" DECIMAL,
  "longitude" DECIMAL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add a unique constraint on first_name + last_name
  UNIQUE("first_name", "last_name")
);

-- Add an index on the city column for better query performance
CREATE INDEX IF NOT EXISTS "idx_contacts_city" ON "contacts"("mailing_city");

-- Add RLS policies
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now
-- This can be restricted later when authentication is implemented
CREATE POLICY "Allow all operations on contacts" ON "contacts"
  USING (true)
  WITH CHECK (true);
