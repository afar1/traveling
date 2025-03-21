import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    
    let query = supabase.from('contacts').select('*');
    
    // Apply city filter if provided
    if (city) {
      query = query.ilike('mailing_city', `%${city}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching contacts:', error);
      return NextResponse.json(
        { error: `Failed to fetch contacts: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ contacts: data || [] });
  } catch (error) {
    console.error('Contacts API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 