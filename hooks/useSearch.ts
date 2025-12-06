import { useState, useEffect, useRef, useCallback } from 'react';
import { Place, UserMap } from '../types';

export interface MapSearchSource {
  map: UserMap;
  places: Place[];
}

export interface SearchResultGroup {
  map: UserMap;
  matches: Place[];
}

interface UseSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResultGroup[];
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  isSearchClosing: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  closeSearch: () => void;
  handleSearchSelect: (place: Place, mapInstance: google.maps.Map | null, onSelect: (p: Place) => void) => void;
}

export function useSearch(
  sources: MapSearchSource[],
  options?: { showAllWhenEmpty?: boolean }
): UseSearchReturn {
  const showAllWhenEmpty = options?.showAllWhenEmpty ?? false;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultGroup[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter results based on query
  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed === '') {
      if (showAllWhenEmpty) {
        const grouped = sources
          .map(source => ({
            map: source.map,
            matches: source.places
          }))
          .filter(group => group.matches.length > 0);
        setSearchResults(grouped);
      } else {
        setSearchResults([]);
      }
      return;
    }

    const lowerQuery = trimmed.toLowerCase();
    const grouped = sources
      .map(source => ({
        map: source.map,
        matches: source.places.filter(p =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.address.toLowerCase().includes(lowerQuery)
        )
      }))
      .filter(group => group.matches.length > 0);
    setSearchResults(grouped);
  }, [searchQuery, sources, showAllWhenEmpty]);

  // Auto-focus search input when activated
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchFocused]);

  const closeSearch = useCallback(() => {
    if (!isSearchFocused && !searchQuery) return;
    setIsSearchClosing(true);
    setTimeout(() => {
      setSearchQuery('');
      setIsSearchFocused(false);
      setIsSearchClosing(false);
    }, 150);
  }, [isSearchFocused, searchQuery]);

  const handleSearchSelect = useCallback((
    place: Place,
    mapInstance: google.maps.Map | null,
    onSelect: (p: Place) => void
  ) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);

    if (mapInstance) {
      mapInstance.setCenter(place.location);
      mapInstance.setZoom(16);
    }

    onSelect(place);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchFocused,
    setIsSearchFocused,
    isSearchClosing,
    searchInputRef,
    closeSearch,
    handleSearchSelect
  };
}
