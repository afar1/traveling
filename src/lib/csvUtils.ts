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
        if (!row['First Name'] || !row['Last Name']) {
          errors.push(`Row ${rowIndex} is missing required fields (First Name, Last Name)`);
          return;
        }
        
        // Create contact object
        const contact: ContactInsert = {
          first_name: row['First Name'],
          last_name: row['Last Name'],
          account_name: row['Account Name'] || '',
          title: row['Title'] || '',
          mailing_street: row['Mailing Street'] || '',
          mailing_city: row['Mailing City'] || '',
          mailing_state: row['Mailing State/Province (text only)'] || '',
          mailing_zip: row['Mailing Zip/Postal Code'] || '',
          mailing_country: row['Mailing Country (text only)'] || '',
          phone: row['Phone'] || '',
          email: row['Email'] || '',
          opportunity_owner: row['Opportunity Owner'] || '',
          latitude: null,
          longitude: null,
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