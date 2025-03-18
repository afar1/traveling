'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Contact } from '@/types/supabase';

// USA states data
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 
  'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 
  'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  // Also include common abbreviations
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY'
];

interface CommandKSearchProps {
  contacts: Contact[];
  onCitySelect: (city: string) => void;
  onContactSelect: (contact: Contact) => void;
}

// Helper function to format address for display
const formatAddress = (contact: Contact) => {
  const parts = [];
  if (contact.mailing_city) parts.push(contact.mailing_city);
  if (contact.mailing_state) parts.push(contact.mailing_state);
  if (parts.length === 0 && contact.mailing_country) parts.push(contact.mailing_country);
  return parts.join(', ');
};

export default function CommandKSearch({ contacts, onCitySelect, onContactSelect }: CommandKSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<{ contacts: Contact[], cities: string[] }>({ contacts: [], cities: [] });
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [searchMode, setSearchMode] = useState<'local' | 'global'>('local');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract unique cities from contacts
  const allCities = useMemo(() => [...new Set(contacts
    .filter(contact => contact.mailing_city)
    .map(contact => contact.mailing_city as string)
  )], [contacts]);

  // Handle search - define this function only once
  const performSearch = useCallback((term: string, mode: 'local' | 'global' = 'local') => {
    if (!term) {
      setResults({ contacts: [], cities: [] });
      setTotalItems(0);
      return;
    }

    const normalizedTerm = term.toLowerCase().trim();
    
    // Search through contacts
    const filteredContacts = contacts
      .filter(contact => {
        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
        const company = contact.account_name?.toLowerCase() || '';
        const city = contact.mailing_city?.toLowerCase() || '';
        const state = contact.mailing_state?.toLowerCase() || '';
        
        return name.includes(normalizedTerm) || 
               company.includes(normalizedTerm) || 
               city.includes(normalizedTerm) || 
               state.includes(normalizedTerm);
      })
      .slice(0, 5); // Limit to 5 contacts

    // Search through cities (from contacts if local mode)
    let filteredCities: string[] = [];
    
    if (mode === 'local') {
      // In local mode - only search cities from existing contacts
      filteredCities = allCities
        .filter(city => city.toLowerCase().includes(normalizedTerm))
        .slice(0, 3); // Limit to 3 cities
    } else {
      // In global mode - we'll allow any search term as a potential location
      // Just add the search term itself as a potential global search
      if (normalizedTerm.length > 1) {
        filteredCities = [term.trim()];
      }
    }

    // Calculate total items for keyboard navigation
    const total = filteredContacts.length + filteredCities.length;
    
    setResults({ contacts: filteredContacts, cities: filteredCities });
    setTotalItems(total);
    setSelectedItemIndex(0); // Reset selection to first item
  }, [contacts, allCities]);

  // Toggle global search mode
  const toggleSearchMode = useCallback(() => {
    setSearchMode(prev => prev === 'local' ? 'global' : 'local');
  }, []);

  // Run search when term or mode changes
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      performSearch(searchTerm, searchMode);
    }
  }, [searchTerm, searchMode, performSearch]);

  // Keyboard listener for cmd+k
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearchTerm('');
        setResults({ contacts: [], cities: [] });
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
      
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation in search results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedItemIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedItemIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter' && totalItems > 0) {
      handleSelectItem(selectedItemIndex);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      toggleSearchMode();
    }
  };

  // Handle selecting an item
  const handleSelectItem = (index: number) => {
    const contactsCount = results.contacts.length;
    
    if (index < contactsCount) {
      // Selected a contact
      onContactSelect(results.contacts[index]);
    } else {
      // Selected a city
      const cityIndex = index - contactsCount;
      onCitySelect(results.cities[cityIndex]);
    }
    
    // Close the dialog
    setIsOpen(false);
  };

  return isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div 
        ref={dialogRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 40px)' }}
      >
        <div className="relative">
          {/* Search input */}
          <div className="flex items-center border-b border-gray-200">
            <div className="pl-4 pr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder={searchMode === 'local' ? "Search contacts and cities..." : "Search anywhere in the world..."}
              className="w-full py-4 px-2 outline-none text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button 
              onClick={toggleSearchMode}
              className={`mr-2 px-3 py-1 rounded-md text-sm font-medium ${
                searchMode === 'global' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {searchMode === 'global' ? '🌎 Global' : '🏙️ Local'}
            </button>
          </div>

          {/* Search results */}
          {totalItems > 0 ? (
            <div className="max-h-80 overflow-y-auto py-2">
              {/* Contacts section */}
              {results.contacts.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contacts
                  </div>
                  {results.contacts.map((contact, index) => (
                    <div
                      key={contact.id}
                      className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${selectedItemIndex === index ? 'bg-gray-100' : ''}`}
                      onClick={() => handleSelectItem(index)}
                    >
                      <div className="font-medium">
                        {contact.first_name} {contact.last_name}
                        {contact.account_name && <span className="ml-2 text-sm text-gray-600">• {contact.account_name}</span>}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatAddress(contact)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cities/Locations section */}
              {results.cities.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {searchMode === 'global' ? 'Search Locations' : 'Cities'}
                  </div>
                  {results.cities.map((city, index) => (
                    <div
                      key={city}
                      className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                        selectedItemIndex === (results.contacts.length + index) ? 'bg-gray-100' : ''
                      }`}
                      onClick={() => handleSelectItem(results.contacts.length + index)}
                    >
                      <div className="font-medium flex items-center">
                        {searchMode === 'global' ? '🌎' : '📍'} {city}
                        {searchMode === 'global' && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            Global Search
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : searchTerm.length > 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No results found{searchMode === 'local' ? '. Try global search?' : ''}</p>
              {searchMode === 'local' && (
                <button 
                  onClick={toggleSearchMode}
                  className="mt-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-sm"
                >
                  🌎 Switch to Global Search
                </button>
              )}
            </div>
          ) : null}

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500 flex justify-between items-center">
            <div>
              <span className="inline-flex items-center mr-3">
                <kbd className="px-1 bg-gray-100 rounded mr-1">↑</kbd>
                <kbd className="px-1 bg-gray-100 rounded mr-1">↓</kbd>
                to navigate
              </span>
              <span className="inline-flex items-center mr-3">
                <kbd className="px-1 bg-gray-100 rounded mr-1">Enter</kbd>
                to select
              </span>
              <span className="inline-flex items-center">
                <kbd className="px-1 bg-gray-100 rounded mr-1">Tab</kbd>
                to toggle search mode
              </span>
            </div>
            <div>
              <kbd className="px-1 bg-gray-100 rounded mr-1">Esc</kbd>
              to close
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
} 