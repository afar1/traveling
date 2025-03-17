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
  name: string;
  address: string;
  company: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface ContactInsert {
  id?: string;
  name: string;
  address: string;
  company: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
} 