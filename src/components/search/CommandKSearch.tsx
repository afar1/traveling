'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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

interface SearchResults {
  contacts: Contact[];
  cities: string[];
  states: string[];
}

interface CommandKSearchProps {
  contacts: Contact[];
  onCitySelect: (city: string) => void;
  onContactSelect: (contact: Contact) => void;
}

// Fuzzy search function
function fuzzyMatch(text: string, query: string): boolean {
  if (!text || !query) return false;
  
  text = text.toLowerCase();
  query = query.toLowerCase();
  
  // Exact match is always good
  if (text.includes(query)) return true;
  
  // Simple fuzzy matching for typos
  let textIndex = 0;
  let queryIndex = 0;
  
  while (textIndex < text.length && queryIndex < query.length) {
    if (text[textIndex] === query[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }
  
  // If we matched all characters in the query, it's a fuzzy match
  return queryIndex === query.length;
}

export default function CommandKSearch({ 
  contacts, 
  onCitySelect, 
  onContactSelect 
}: CommandKSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResults>({ 
    contacts: [], 
    cities: [],
    states: []
  });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeSection, setActiveSection] = useState<'contacts' | 'cities' | 'states'>('contacts');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Extract unique cities and states using useMemo to prevent recreation on every render
  const { cities, states } = useMemo(() => {
    const uniqueCities = Array.from(new Set(
      contacts
        .map((contact) => contact.mailing_city)
        .filter(Boolean) as string[]
    )).sort();
    
    const uniqueStates = Array.from(new Set(
      contacts
        .map((contact) => contact.mailing_state)
        .filter(Boolean) as string[]
    )).sort();
    
    return { cities: uniqueCities, states: uniqueStates };
  }, [contacts]);
  
  // Listen for Command+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearchTerm('');
        setResults({ contacts: [], cities: [], states: [] });
        setSelectedIndex(-1);
        
        // Focus input after a short delay to allow modal to open
        setTimeout(() => {
          inputRef.current?.focus();
        }, 10);
      }
      
      // Close with Escape
      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // Handle search input changes with fuzzy matching
  useEffect(() => {
    if (!isOpen) return;
    
    if (!searchTerm.trim()) {
      setResults({ contacts: [], cities: [], states: [] });
      setSelectedIndex(-1);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    // Search contacts
    const matchedContacts = contacts.filter(contact => {
      const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
      return fuzzyMatch(fullName, term) ||
             fuzzyMatch(contact.account_name || '', term) ||
             fuzzyMatch(contact.mailing_city || '', term) ||
             fuzzyMatch(contact.mailing_state || '', term);
    }).slice(0, 5); // Limit to 5 contacts
    
    // Fuzzy search cities from contacts
    const matchedCities = cities
      .filter(city => fuzzyMatch(city.toLowerCase(), term))
      .slice(0, 3); // Limit to 3 cities
    
    // Fuzzy search states - both from contacts and the US states list
    const contactStates = states.filter(state => fuzzyMatch(state.toLowerCase(), term));
    
    // Also search the US states list that aren't in our contacts
    const additionalStates = US_STATES.filter(state => {
      const stateInContacts = states.some(s => s.toLowerCase() === state.toLowerCase());
      return !stateInContacts && fuzzyMatch(state.toLowerCase(), term);
    });
    
    // Combine and de-duplicate states
    const matchedStates = Array.from(new Set([...contactStates, ...additionalStates]))
      .slice(0, 3); // Limit to 3 states
    
    setResults({ 
      contacts: matchedContacts, 
      cities: matchedCities,
      states: matchedStates
    });
    
    // Reset selection
    setSelectedIndex(-1);
    
    // Set active section based on which has results
    if (matchedContacts.length > 0) {
      setActiveSection('contacts');
    } else if (matchedCities.length > 0) {
      setActiveSection('cities');
    } else if (matchedStates.length > 0) {
      setActiveSection('states');
    }
  }, [searchTerm, contacts, cities, states, isOpen]);
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyNav = (e: KeyboardEvent) => {
      // Arrow down - move selection down
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        
        const totalContactItems = results.contacts.length;
        const totalCityItems = results.cities.length;
        const totalStateItems = results.states.length;
        
        if (activeSection === 'contacts') {
          // If at the end of contacts section, move to cities section
          if (selectedIndex >= totalContactItems - 1) {
            if (totalCityItems > 0) {
              setActiveSection('cities');
              setSelectedIndex(0);
            } else if (totalStateItems > 0) {
              setActiveSection('states');
              setSelectedIndex(0);
            }
          } else if (totalContactItems > 0) {
            // Move down within contacts
            setSelectedIndex(prev => Math.min(prev + 1, totalContactItems - 1));
          }
        } else if (activeSection === 'cities') {
          // If at the end of cities section, move to states section
          if (selectedIndex >= totalCityItems - 1) {
            if (totalStateItems > 0) {
              setActiveSection('states');
              setSelectedIndex(0);
            }
          } else if (totalCityItems > 0) {
            // Move down within cities
            setSelectedIndex(prev => Math.min(prev + 1, totalCityItems - 1));
          }
        } else if (activeSection === 'states' && totalStateItems > 0) {
          // Move down within states
          setSelectedIndex(prev => Math.min(prev + 1, totalStateItems - 1));
        }
      }
      
      // Arrow up - move selection up
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        
        const totalContactItems = results.contacts.length;
        const totalCityItems = results.cities.length;
        
        if (activeSection === 'states') {
          // If at the start of states section, move to cities or contacts section
          if (selectedIndex <= 0) {
            if (totalCityItems > 0) {
              setActiveSection('cities');
              setSelectedIndex(totalCityItems - 1);
            } else if (totalContactItems > 0) {
              setActiveSection('contacts');
              setSelectedIndex(totalContactItems - 1);
            }
          } else {
            // Move up within states
            setSelectedIndex(prev => Math.max(prev - 1, 0));
          }
        } else if (activeSection === 'cities') {
          // If at the start of cities section, move to contacts section
          if (selectedIndex <= 0) {
            if (totalContactItems > 0) {
              setActiveSection('contacts');
              setSelectedIndex(totalContactItems - 1);
            }
          } else {
            // Move up within cities
            setSelectedIndex(prev => Math.max(prev - 1, 0));
          }
        } else if (activeSection === 'contacts') {
          // Move up within contacts
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
      }
      
      // Enter - select item
      if (e.key === 'Enter') {
        e.preventDefault();
        
        if (selectedIndex >= 0) {
          if (activeSection === 'contacts' && results.contacts[selectedIndex]) {
            onContactSelect(results.contacts[selectedIndex]);
            setIsOpen(false);
          } else if (activeSection === 'cities' && results.cities[selectedIndex]) {
            onCitySelect(results.cities[selectedIndex]);
            setIsOpen(false);
          } else if (activeSection === 'states' && results.states[selectedIndex]) {
            // For state selection, we'll use the same handler as city selection
            onCitySelect(results.states[selectedIndex]);
            setIsOpen(false);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [isOpen, results, selectedIndex, activeSection, onContactSelect, onCitySelect]);
  
  // Handle outside click to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && 
          modalRef.current && 
          !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Helper function to format address
  const formatAddress = (contact: Contact) => {
    const parts = [];
    if (contact.mailing_city) parts.push(contact.mailing_city);
    if (contact.mailing_state) parts.push(contact.mailing_state);
    if (parts.length === 0 && contact.mailing_country) parts.push(contact.mailing_country);
    return parts.join(', ');
  };
  
  // If not open, render nothing visible
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-700/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Dialog */}
      <div 
        ref={modalRef}
        className="relative flex items-start justify-center min-h-screen pt-24 px-4 sm:px-6"
      >
        <div className="w-full max-w-xl mx-auto overflow-hidden rounded-xl shadow-2xl bg-white ring-1 ring-black/5">
          {/* Search input */}
          <div className="relative p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search contacts, cities, or states..."
                className="flex-1 border-0 bg-transparent py-1.5 focus:ring-0 focus:outline-none text-gray-900 placeholder:text-gray-400 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                aria-autocomplete="none"
              />
              
              <div className="flex items-center gap-1">
                <kbd className="hidden sm:inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-gray-100 font-sans text-xs text-gray-500">⌘</kbd>
                <kbd className="hidden sm:inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-gray-100 font-sans text-xs text-gray-500">K</kbd>
              </div>
            </div>
          </div>
          
          {/* Search results */}
          <div className="max-h-[24rem] overflow-y-auto overscroll-contain py-2">
            {results.contacts.length === 0 && results.cities.length === 0 && results.states.length === 0 && searchTerm && (
              <div className="px-4 py-10 text-center">
                <p className="text-gray-500">No results found</p>
                <p className="text-sm text-gray-400 mt-1">Try searching for something else</p>
              </div>
            )}
            
            {/* Contacts section */}
            {results.contacts.length > 0 && (
              <div>
                <div className="px-4 py-1">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacts</h3>
                </div>
                <ul>
                  {results.contacts.map((contact, idx) => (
                    <li 
                      key={contact.id}
                      className={`px-4 py-2 cursor-pointer transition-colors ${
                        activeSection === 'contacts' && idx === selectedIndex 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        onContactSelect(contact);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => {
                        setActiveSection('contacts');
                        setSelectedIndex(idx);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 rounded-full h-8 w-8 bg-gray-200 flex items-center justify-center text-gray-600">
                          {contact.first_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{formatAddress(contact)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Cities section */}
            {results.cities.length > 0 && (
              <div>
                <div className="px-4 py-1">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cities</h3>
                </div>
                <ul>
                  {results.cities.map((city, idx) => (
                    <li 
                      key={city}
                      className={`px-4 py-2 cursor-pointer transition-colors ${
                        activeSection === 'cities' && idx === selectedIndex 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        onCitySelect(city);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => {
                        setActiveSection('cities');
                        setSelectedIndex(idx);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 rounded-full h-8 w-8 bg-blue-100 flex items-center justify-center text-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-900">{city}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* States section */}
            {results.states.length > 0 && (
              <div>
                <div className="px-4 py-1">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">States</h3>
                </div>
                <ul>
                  {results.states.map((state, idx) => (
                    <li 
                      key={state}
                      className={`px-4 py-2 cursor-pointer transition-colors ${
                        activeSection === 'states' && idx === selectedIndex 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        onCitySelect(state);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => {
                        setActiveSection('states');
                        setSelectedIndex(idx);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 rounded-full h-8 w-8 bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-900">{state}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Footer with search commands */}
          {(results.contacts.length > 0 || results.cities.length > 0 || results.states.length > 0) && (
            <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-500">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-500">↓</kbd>
                    <span>to navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-500">Enter</kbd>
                    <span>to select</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-500">Esc</kbd>
                  <span>to close</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 