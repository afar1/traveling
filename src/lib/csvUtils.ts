import Papa from 'papaparse';
import { ContactInsert } from '@/types/supabase';

interface CSVParseResult {
  contacts: ContactInsert[];
  errors: string[];
}

export function parseCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    const contacts: ContactInsert[] = [];
    const errors: string[] = [];
    let rowIndex = 0;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      step: (results) => {
        rowIndex++;
        const row = results.data as Record<string, string>;
        
        // Validate required fields
        if (!row.name || !row.address || !row.company) {
          errors.push(`Row ${rowIndex} is missing required fields`);
          return;
        }
        
        // Extract city if not provided but present in address
        let city = row.city || '';
        if (!city && row.address) {
          // Simple city extraction logic - could be improved
          const addressParts = row.address.split(',');
          if (addressParts.length > 1) {
            city = addressParts[addressParts.length - 2].trim();
          }
        }
        
        // Create contact object
        const contact: ContactInsert = {
          name: row.name,
          address: row.address,
          company: row.company,
          city: city,
          latitude: row.latitude ? parseFloat(row.latitude) : null,
          longitude: row.longitude ? parseFloat(row.longitude) : null,
        };
        
        contacts.push(contact);
      },
      complete: () => {
        resolve({ contacts, errors });
      },
      error: (error) => {
        errors.push(`CSV parsing error: ${error.message}`);
        resolve({ contacts, errors });
      }
    });
  });
} 