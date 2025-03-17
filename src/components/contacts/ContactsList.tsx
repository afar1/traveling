'use client';

import { useState, useEffect } from 'react';
import { Contact } from '@/types/supabase';

interface ContactsListProps {
  contacts: Contact[];
  onCitySelect: (city: string) => void;
  selectedCity?: string;
}

export default function ContactsList({
  contacts,
  onCitySelect,
  selectedCity,
}: ContactsListProps) {
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>(contacts);
  const [searchTerm, setSearchTerm] = useState(selectedCity || '');
  
  // Extract unique cities for the dropdown
  const cities = Array.from(new Set(contacts.map((contact) => contact.city)))
    .filter(Boolean)
    .sort();

  // Update filtered contacts when selected city or contacts change
  useEffect(() => {
    if (selectedCity) {
      setFilteredContacts(
        contacts.filter((contact) =>
          contact.city.toLowerCase().includes(selectedCity.toLowerCase())
        )
      );
      setSearchTerm(selectedCity);
    } else {
      setFilteredContacts(contacts);
      setSearchTerm('');
    }
  }, [selectedCity, contacts]);

  // Handle search input change with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm) {
        onCitySelect(searchTerm);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, onCitySelect]);

  // Handle search form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      onCitySelect(searchTerm);
    }
  };

  // Clear search filter
  const handleClearFilter = () => {
    setSearchTerm('');
    onCitySelect('');
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <form onSubmit={handleSubmit} className="flex gap-1 mb-2">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search by city..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              list="city-list"
            />
            <datalist id="city-list">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            className="px-2 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            Search
          </button>
        </form>
        
        {selectedCity && (
          <button
            type="button"
            onClick={handleClearFilter}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="text-sm text-gray-500 mb-2">
        {filteredContacts.length} contacts{selectedCity ? ` in "${selectedCity}"` : ''}
      </div>

      <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
        <div className="divide-y divide-gray-200 max-h-[calc(100vh-200px)] overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <div key={contact.id} className="p-3 hover:bg-gray-50">
                <div className="font-medium">{contact.name}</div>
                <div className="text-sm text-gray-600">{contact.company}</div>
                <div className="text-xs text-gray-500 mt-1 truncate" title={contact.address}>
                  {contact.address}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  <button
                    className="hover:underline"
                    onClick={() => onCitySelect(contact.city)}
                  >
                    {contact.city}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              {selectedCity
                ? `No contacts found in "${selectedCity}"`
                : 'No contacts available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 