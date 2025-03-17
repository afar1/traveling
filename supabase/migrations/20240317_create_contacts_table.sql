-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create contacts table
CREATE TABLE IF NOT EXISTS "contacts" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "city" TEXT,
  "latitude" DECIMAL,
  "longitude" DECIMAL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add an index on the city column for better query performance
CREATE INDEX IF NOT EXISTS "idx_contacts_city" ON "contacts"("city");

-- Add RLS policies
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now
-- This can be restricted later when authentication is implemented
CREATE POLICY "Allow all operations on contacts" ON "contacts"
  USING (true)
  WITH CHECK (true); 