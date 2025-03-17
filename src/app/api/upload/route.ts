import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { geocodeContact } from '@/lib/geocoding';
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

    // Clear existing contacts
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .is('id', 'not.null');
      
    if (deleteError) {
      console.error('Error clearing contacts:', deleteError);
      results.errors.push(`Error clearing existing contacts: ${deleteError.message}`);
    }

    // Process each contact
    for (const contact of contacts) {
      try {
        // Geocode the address if not already geocoded
        if (!contact.latitude || !contact.longitude) {
          const geocodeResult = await geocodeContact(
            contact.mailing_street,
            contact.mailing_city,
            contact.mailing_state,
            contact.mailing_zip,
            contact.mailing_country
          );
          
          contact.latitude = geocodeResult.latitude;
          contact.longitude = geocodeResult.longitude;
          
          if (geocodeResult.error) {
            console.warn(`Geocoding warning for "${contact.first_name} ${contact.last_name}": ${geocodeResult.error}`);
          }
        }

        // Insert contact into database using upsert
        // If there's a duplicate based on first_name + last_name, it will update
        const { error } = await supabase
          .from('contacts')
          .upsert(contact, {
            onConflict: 'first_name,last_name'
          });

        if (error) {
          results.failed++;
          results.errors.push(`Failed to insert contact "${contact.first_name} ${contact.last_name}": ${error.message}`);
        } else {
          results.successful++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Error processing contact "${contact.first_name} ${contact.last_name}": ${error instanceof Error ? error.message : 'Unknown error'}`
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