/*
  # URL Shortener Database Schema

  ## Overview
  Creates a database schema for a URL shortener service that stores shortened URLs
  and tracks their usage statistics.

  ## New Tables
  
  ### `urls`
  - `id` (uuid, primary key) - Unique identifier for each URL entry
  - `short_code` (text, unique) - The shortened URL code (e.g., "abc123")
  - `original_url` (text) - The full original URL to redirect to
  - `title` (text, optional) - Optional title/description for the URL
  - `clicks` (integer) - Number of times this short URL has been clicked
  - `created_at` (timestamptz) - When the short URL was created
  - `updated_at` (timestamptz) - Last time the record was updated

  ## Security
  - Enable Row Level Security (RLS) on `urls` table
  - Add policy to allow anyone to read URLs (needed for redirects)
  - Add policy to allow anyone to insert URLs (public URL shortener)
  - Add policy to allow anyone to update click counts

  ## Indexes
  - Unique index on `short_code` for fast lookups during redirects
  - Index on `created_at` for sorting and filtering
*/

CREATE TABLE IF NOT EXISTS urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code text UNIQUE NOT NULL,
  original_url text NOT NULL,
  title text,
  clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read URLs"
  ON urls FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create URLs"
  ON urls FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update click counts"
  ON urls FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls(created_at DESC);