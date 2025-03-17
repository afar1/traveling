# Traveling

An internal CRM and interactive map application for managing contacts by location. This application allows you to:

- Upload contacts via CSV file
- Visualize contacts on an interactive map
- Filter contacts by city
- See detailed contact information

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase
- **Mapping**: Leaflet.js
- **CSV Parsing**: Papaparse

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier available)

### Setting Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Create a `contacts` table with the following schema:

```sql
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  company TEXT NOT NULL,
  city TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add an index on the city column for better query performance
CREATE INDEX idx_contacts_city ON contacts(city);
```

3. Get your project URL and anon key from the Supabase dashboard API settings

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/traveling.git
   cd traveling
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Copy the example environment file and fill in your Supabase details
   ```bash
   cp .env.local.example .env.local
   ```

4. Update `.env.local` with your Supabase project URL and anon key

5. Start the development server
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## CSV Upload Format

The CSV file should include the following columns:

| Column    | Required    | Description                                      |
|-----------|-------------|--------------------------------------------------|
| name      | Yes         | Contact's full name                              |
| address   | Yes         | Full address                                     |
| company   | Yes         | Company name                                     |
| city      | Recommended | City name (extracted from address if not provided) |
| latitude  | Optional    | Latitude coordinate (geocoded if not provided)   |
| longitude | Optional    | Longitude coordinate (geocoded if not provided)  |

Example CSV:
```
name,address,company,city,latitude,longitude
John Doe,123 Main St Suite 101 San Francisco CA 94105,Acme Inc,San Francisco,37.7897967,-122.3982773
Jane Smith,456 Broadway New York NY 10013,Tech Co,New York,,
```

## Features

- **CSV Upload**: Bulk import contacts with geocoding
- **Interactive Map**: View all contacts on a map with popup details
- **City Filtering**: Search and filter contacts by city
- **Responsive Design**: Works on desktop and mobile devices

## Deployment

Deploy the Next.js application using a platform like Vercel:

1. Connect your GitHub repository to Vercel
2. Add the environment variables in the Vercel project settings
3. Deploy the application

## License

[MIT](LICENSE)
