export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: Contact;
        Insert: ContactInsert;
        Update: Partial<ContactInsert>;
      };
    };
  };
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  account_name?: string;
  title?: string;
  mailing_street?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
  mailing_country?: string;
  phone?: string;
  email?: string;
  opportunity_owner?: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface ContactInsert {
  id?: string;
  first_name: string;
  last_name: string;
  account_name?: string;
  title?: string;
  mailing_street?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
  mailing_country?: string;
  phone?: string;
  email?: string;
  opportunity_owner?: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
} 