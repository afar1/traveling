import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { geocodeAddress } from '@/lib/geocoding';
import { ContactInsert } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const contacts: ContactInsert[] = data.contacts;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'No valid contacts provided' },
        { status: 400 }
      );
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each contact
    for (const contact of contacts) {
      try {
        // Geocode the address if coordinates are not provided
        if (!contact.latitude || !contact.longitude) {
          const geocodeResult = await geocodeAddress(contact.address);
          contact.latitude = geocodeResult.latitude;
          contact.longitude = geocodeResult.longitude;
          
          if (geocodeResult.error) {
            console.warn(`Geocoding warning for "${contact.address}": ${geocodeResult.error}`);
          }
        }

        // Insert contact into database
        const { error } = await supabase
          .from('contacts')
          .insert(contact);

        if (error) {
          results.failed++;
          results.errors.push(`Failed to insert contact "${contact.name}": ${error.message}`);
        } else {
          results.successful++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Error processing contact "${contact.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      message: `Processed ${contacts.length} contacts: ${results.successful} successful, ${results.failed} failed`,
      results
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
} 