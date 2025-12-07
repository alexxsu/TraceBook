import React, { useState, useCallback, useMemo, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Place, Visit, ViewState, UserMap, GUEST_ID } from './types';
import { db, GOOGLE_MAPS_API_KEY } from './firebaseConfig';

// Hooks
import {
  useAuth,
  useMaps,
  usePlaces,
  useSearch,
  useFilter,
  useMapControls,
  useNotifications
} from './hooks';

// Components
import MapContainer from './components/MapContainer';
import AddVisitModal from './components/AddVisitModal';
import PlaceDetail from './components/PlaceDetail';
import InfoModal from './components/InfoModal';
import UserHistoryModal from './components/UserHistoryModal';
import EditVisitModal from './components/EditVisitModal';
import StatsModal from './components/StatsModal';
import MapManagementModal from './components/MapManagementModal';
import { SiteManagementModal } from './components/SiteManagementModal';
import { Tutorial, TutorialButton } from './components/Tutorial';

// New extracted components
import { LoginScreen } from './components/LoginScreen';
import { PendingScreen } from './components/PendingScreen';
import { HeaderBar } from './components/HeaderBar';
import { MapSelectorPill } from './components/MapSelectorPill';
import { SideMenu } from './components/SideMenu';
import { UserDetailModal } from './components/UserDetailModal';
import { MemberAvatars } from './components/MemberAvatars';
import { NavigationIsland, NavigationPage } from './components/NavigationIsland';
import { MapControls, MapControlsRef } from './components/MapControls';
import { Toast } from './components/Toast';
import { UserLocationMarker } from './components/UserLocationMarker';
import { FriendsPage } from './components/FriendsPage';
import { FeedsPage } from './components/FeedsPage';

function App() {
  // Auth hook
  const {
    user,
    userProfile,
    isCheckingStatus,
    login,
    loginWithEmail,
    signUpWithEmail,
    resendVerificationEmail,
    loginAsGuest,
    logout,
    refreshStatus,
    updateUserProfile
  } = useAuth();

  // View state
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);

  // Maps hook
  const {
    activeMap,
    setActiveMap,
    allMaps,
    userOwnMaps,
    userSharedMaps,
    userJoinedMaps,
    createSharedMap,
    joinSharedMap,
    leaveSharedMap,
    kickMember
  } = useMaps(user, userProfile);

  // Notifications hook
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    notifyMapMembers
  } = useNotifications(user);

  // Places hook
  const {
    places,
    selectedPlace,
    setSelectedPlace,
    saveVisit,
    updateVisit,
    deleteVisit,
    clearDatabase
  } = usePlaces(user, userProfile, activeMap, viewState, setViewState);

  const isGuestUser = user?.uid === GUEST_ID || user?.isAnonymous || userProfile?.role === 'guest';
  const isAdmin = userProfile?.role === 'admin';

  // Debug: Log the map arrays when they change
  React.useEffect(() => {
    console.log('[Maps Debug] allMaps:', allMaps.length, allMaps.map(m => ({ id: m.id, name: m.name, owner: m.ownerDisplayName })));
    console.log('[Maps Debug] userOwnMaps:', userOwnMaps.length, userOwnMaps.map(m => ({ id: m.id, name: m.name })));
    console.log('[Maps Debug] userJoinedMaps:', userJoinedMaps.length, userJoinedMaps.map(m => ({ id: m.id, name: m.name })));
    console.log('[Maps Debug] isAdmin:', isAdmin, 'isGuestUser:', isGuestUser);
  }, [allMaps, userOwnMaps, userJoinedMaps, isAdmin, isGuestUser]);

  // Map-aware search data
  const [searchablePins, setSearchablePins] = useState<Record<string, Place[]>>({});

  // Maps that should appear in the search module
  // - Admin: ALL maps in the system (they can see everything for moderation)
  // - Normal user: Their own maps (userOwnMaps) + maps they joined (userJoinedMaps), NOT demo map
  // - Guest: Only demo map
  const searchableMaps = useMemo(() => {
    if (!user) {
      console.log('[SearchableMaps] No user, returning empty');
      return [];
    }

    let candidates: UserMap[] = [];

    if (isGuestUser) {
      // Guest users: only demo map in search
      console.log('[SearchableMaps] Guest user, using activeMap (demo)');
      if (activeMap) {
        candidates = [activeMap];
      }
    } else if (isAdmin) {
      // Admin can see ALL maps in the system
      console.log('[SearchableMaps] Admin user, using allMaps:', allMaps.length);
      candidates = [...allMaps];
      
      // Ensure demo map is included if it exists in the database
      // The demo map might be in allMaps already, but check just in case
      const hasDemoMap = candidates.some(m => m.id === 'guest-demo-map');
      if (!hasDemoMap) {
        // Add demo map definition for admin to search
        candidates.push({
          id: 'guest-demo-map',
          ownerUid: 'demo-owner',
          ownerDisplayName: 'Demo',
          name: 'Demo Map',
          visibility: 'public',
          isDefault: true,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      // Normal users: their own maps + maps they joined (NO demo map)
      // userOwnMaps includes: default map + any shared maps they created
      // userJoinedMaps includes: shared maps they joined (created by others)
      console.log('[SearchableMaps] Normal user - userOwnMaps:', userOwnMaps.length, 'userJoinedMaps:', userJoinedMaps.length);
      candidates = [...userOwnMaps, ...userJoinedMaps];
      // Filter out demo/guest maps from search for normal users
      candidates = candidates.filter(map => map.id !== 'guest-demo-map');
    }

    // Deduplicate by map ID
    const seen = new Set<string>();
    const result = candidates.filter((map) => {
      if (seen.has(map.id)) return false;
      seen.add(map.id);
      return true;
    });
    
    console.log('[SearchableMaps] Final result:', result.map(m => ({ id: m.id, name: m.name })));
    return result;
  }, [activeMap, allMaps, isAdmin, isGuestUser, user, userOwnMaps, userJoinedMaps]);

  // Keep active map pins in the search cache (always add current map's places)
  React.useEffect(() => {
    if (activeMap) {
      setSearchablePins((prev) => ({
        ...prev,
        [activeMap.id]: places
      }));
    }
  }, [activeMap, places]);

  // Track which maps have been fetched (use ref to avoid triggering re-renders)
  const fetchedMapIdsRef = React.useRef<Set<string>>(new Set());
  
  // Track the last time we did a full refresh
  const lastRefreshRef = React.useRef<number>(0);

  const sortedSearchableMaps = useMemo(() => {
    const weight = (m: UserMap) => {
      if (m.isDefault) return 0;
      if (m.visibility === 'shared') return 1;
      return 2;
    };
    return [...searchableMaps].sort((a, b) => weight(a) - weight(b));
  }, [searchableMaps]);

  const searchSources = useMemo(() => (
    sortedSearchableMaps.map((map) => ({
      map,
      places: searchablePins[map.id] || []
    }))
  ), [sortedSearchableMaps, searchablePins]);

  // Search hook
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchFocused,
    setIsSearchFocused,
    isSearchClosing,
    searchInputRef,
    closeSearch,
    handleSearchSelect
  } = useSearch(searchSources, { showAllWhenEmpty: true });

  // Fetch pins for other maps - runs on initial load and when search is opened
  React.useEffect(() => {
    let cancelled = false;

    const fetchPins = async () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      
      // When search is focused, refetch maps that have 0 pins (they might have new data)
      // Also refetch if it's been more than 30 seconds since last refresh
      const shouldRefreshEmpty = isSearchFocused && timeSinceLastRefresh > 5000;
      
      // Filter maps that need fetching
      const mapsToFetch = searchableMaps.filter((map) => {
        // Skip active map (it's always up to date via places state)
        if (map.id === activeMap?.id) return false;
        
        // If never fetched, fetch it
        if (!fetchedMapIdsRef.current.has(map.id)) return true;
        
        // If search is focused and this map has 0 pins, refetch to check for new pins
        if (shouldRefreshEmpty) {
          const currentPins = searchablePins[map.id];
          if (!currentPins || currentPins.length === 0) {
            // Remove from cache so it will be refetched
            fetchedMapIdsRef.current.delete(map.id);
            return true;
          }
        }
        
        return false;
      });

      if (mapsToFetch.length === 0) {
        return;
      }
      
      if (shouldRefreshEmpty) {
        lastRefreshRef.current = now;
      }
      
      console.log('[FetchPins] Maps to fetch:', mapsToFetch.length, mapsToFetch.map(m => ({ id: m.id, name: m.name, visibility: m.visibility })));

      for (const map of mapsToFetch) {
        if (cancelled) break;
        
        // Mark as being fetched immediately to prevent duplicate fetches
        fetchedMapIdsRef.current.add(map.id);
        
        try {
          console.log(`[FetchPins] Fetching places for map: ${map.name} (${map.id})`);
          // Note: Firestore collection is named 'restaurants' for backward compatibility
          const placesRef = collection(db, 'maps', map.id, 'restaurants');
          const snap = await getDocs(placesRef);
          const pins = snap.docs
            .map((docSnap) => docSnap.data() as Place)
            .filter((r: any) => !Array.isArray(r.visits) || r.visits.length > 0);

          console.log(`[FetchPins] ✓ Loaded ${pins.length} places from map: ${map.name}`);

          if (!cancelled) {
            setSearchablePins((prev) => ({
              ...prev,
              [map.id]: pins
            }));
          }
        } catch (error: any) {
          // Log the error for debugging
          console.error(`[FetchPins] ✗ Error fetching map ${map.name} (${map.id}):`, error?.code || error);
          
          // Still set empty array so map appears in search (just with 0 places)
          if (!cancelled) {
            setSearchablePins((prev) => ({
              ...prev,
              [map.id]: []
            }));
          }
        }
      }
    };

    // Fetch when:
    // 1. searchableMaps changes and we have maps to fetch (initial load or new maps added)
    // 2. Search is focused (user opened search module)
    if (searchableMaps.length > 0) {
      fetchPins();
    }

    return () => {
      cancelled = true;
    };
  }, [activeMap?.id, searchableMaps, searchablePins, isSearchFocused]);

  // Filter hook
  const {
    selectedGrades,
    isFilterOpen,
    isFilterClosing,
    filteredPlaces,
    toggleGradeFilter,
    selectAllGrades,
    clearAllGrades,
    handleFilterToggle,
    closeFilter
  } = useFilter(places);

  // Map controls hook
  const {
    mapInstance,
    currentMapCenter,
    mapType,
    handleMapLoad,
    handleToggleMapType,
    handleLocateMe,
    handleResetView,
    handleZoomToMunicipality
  } = useMapControls();

  // Ref for MapControls to reset click state
  const mapControlsRef = useRef<MapControlsRef>(null);

  // UI State
  const [hideAddButton, setHideAddButton] = useState(false);
  const [isAddModalClosing, setIsAddModalClosing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [isMenuAnimatingIn, setIsMenuAnimatingIn] = useState(false);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [isUserDetailClosing, setIsUserDetailClosing] = useState(false);
  const [isCompactCardOpen, setIsCompactCardOpen] = useState(false);
  const [editingData, setEditingData] = useState<{ place: Place; visit: Visit } | null>(null);
  const [pendingSearchSelection, setPendingSearchSelection] = useState<{ place: Place; map: UserMap } | null>(null);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [mapSwitchToast, setMapSwitchToast] = useState<{ visible: boolean; mapName: string; mapOwner?: string; mapVisibility?: 'public' | 'shared' | 'private' }>({ visible: false, mapName: '' });
  
  // Navigation state
  const [currentNavPage, setCurrentNavPage] = useState<NavigationPage>('map');
  const [friendsPageVisible, setFriendsPageVisible] = useState(false);
  const [feedsPageVisible, setFeedsPageVisible] = useState(false);
  const [friendsAnimatingOut, setFriendsAnimatingOut] = useState(false);
  const [feedsAnimatingOut, setFeedsAnimatingOut] = useState(false);
  const [friendsAnimationDirection, setFriendsAnimationDirection] = useState<'left' | 'right'>('left');
  const [feedsAnimationDirection, setFeedsAnimationDirection] = useState<'left' | 'right'>('right');

  // Page order for determining animation direction: friends(0) < map(1) < feeds(2)
  const getPageOrder = (page: NavigationPage): number => {
    switch (page) {
      case 'friends': return 0;
      case 'map': return 1;
      case 'feeds': return 2;
    }
  };

  // Navigation handlers
  const handleNavigation = useCallback((page: NavigationPage) => {
    if (page === currentNavPage) return;
    
    const fromOrder = getPageOrder(currentNavPage);
    const toOrder = getPageOrder(page);
    const goingRight = toOrder > fromOrder; // true if navigating right, false if left
    
    // First, animate out the current page (if not map)
    if (currentNavPage === 'friends') {
      setFriendsAnimationDirection(goingRight ? 'left' : 'right'); // Exit opposite to navigation direction
      setFriendsAnimatingOut(true);
    } else if (currentNavPage === 'feeds') {
      setFeedsAnimationDirection(goingRight ? 'left' : 'right');
      setFeedsAnimatingOut(true);
    }
    
    // After exit animation, show new page
    setTimeout(() => {
      // Hide the old page
      if (currentNavPage === 'friends') {
        setFriendsPageVisible(false);
        setFriendsAnimatingOut(false);
      } else if (currentNavPage === 'feeds') {
        setFeedsPageVisible(false);
        setFeedsAnimatingOut(false);
      }
      
      // Update current page
      setCurrentNavPage(page);
      
      // Show and animate in the new page (if not map)
      if (page === 'friends') {
        setFriendsAnimationDirection(goingRight ? 'right' : 'left'); // Enter from navigation direction
        setFriendsPageVisible(true);
      } else if (page === 'feeds') {
        setFeedsAnimationDirection(goingRight ? 'right' : 'left');
        setFeedsPageVisible(true);
      }
    }, currentNavPage === 'map' ? 50 : 300); // Faster if coming from map (no exit animation)
  }, [currentNavPage]);

  // Tutorial handlers
  const handleStartTutorial = useCallback(() => {
    // Close any open menus/modals
    setIsMenuOpen(false);
    setIsCompactCardOpen(false);
    setIsUserDetailOpen(false);
    closeSearch();
    closeFilter();
    // Close map management if it's open
    if (viewState === ViewState.MAP_MANAGEMENT) {
      setViewState(ViewState.MAP);
    }
    setIsTutorialActive(true);
  }, [closeSearch, closeFilter, viewState]);

  const handleTutorialComplete = useCallback(() => {
    setIsTutorialActive(false);
    // Close map management modal after tutorial ends - only if open
    if (viewState === ViewState.MAP_MANAGEMENT) {
      setViewState(ViewState.MAP);
    }
    // Close compact card - only if open
    if (isCompactCardOpen) {
      setIsCompactCardOpen(false);
    }
    // Close side menu - only if open (prevents flicker)
    if (isMenuOpen) {
      setIsMenuClosing(true);
      setTimeout(() => {
        setIsMenuOpen(false);
        setIsMenuClosing(false);
        setIsMenuAnimatingIn(false);
      }, 300);
    }
    // Close filter only if open (prevents flicker)
    if (isFilterOpen) {
      closeFilter();
    }
    // Close search only if open (the hook already has this guard)
    closeSearch();
  }, [viewState, closeFilter, closeSearch, isCompactCardOpen, isMenuOpen, isFilterOpen]);

  const handleTutorialSkip = useCallback(() => {
    setIsTutorialActive(false);
    // Close map management modal after tutorial skip - only if open
    if (viewState === ViewState.MAP_MANAGEMENT) {
      setViewState(ViewState.MAP);
    }
    // Close compact card - only if open
    if (isCompactCardOpen) {
      setIsCompactCardOpen(false);
    }
    // Close side menu - only if open (prevents flicker)
    if (isMenuOpen) {
      setIsMenuClosing(true);
      setTimeout(() => {
        setIsMenuOpen(false);
        setIsMenuClosing(false);
        setIsMenuAnimatingIn(false);
      }, 300);
    }
    // Close filter only if open (prevents flicker)
    if (isFilterOpen) {
      closeFilter();
    }
    // Close search only if open (the hook already has this guard)
    closeSearch();
  }, [viewState, closeFilter, closeSearch, isCompactCardOpen, isMenuOpen, isFilterOpen]);

  // Open map management for tutorial
  const handleOpenMapManagementForTutorial = useCallback(() => {
    setViewState(ViewState.MAP_MANAGEMENT);
  }, []);

  // Derive view state from user/profile status
  React.useEffect(() => {
    if (!user) {
      setViewState(ViewState.LOGIN);
    } else if (user.isAnonymous) {
      setViewState(ViewState.MAP);
    } else if (userProfile) {
      // Check if email is verified OR admin approved (only one condition needed)
      const emailVerified = user.emailVerified ?? userProfile.emailVerified ?? false;
      const isApproved = userProfile.status === 'approved';

      if (emailVerified || isApproved) {
        if (viewState === ViewState.LOGIN || viewState === ViewState.PENDING) {
          setViewState(ViewState.MAP);
        }
      } else {
        setViewState(ViewState.PENDING);
      }
    }
  }, [user, userProfile]);

  // Time-based greeting notification - send once per part of day (morning/afternoon/evening/night)
  const [hasShownGreeting, setHasShownGreeting] = React.useState(false);
  React.useEffect(() => {
    const sendGreetingNotification = async () => {
      if (!user || user.isAnonymous || hasShownGreeting) return;
      if (!userProfile || userProfile.status !== 'approved') return;

      // Get current time info
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
      const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD

      // Determine time period with time-specific emoji - only 3 periods
      const getGreetingByHour = (h: number) => {
        if (h >= 5 && h < 12) {
          return { period: 'morning' as const, emoji: '☀️', en: 'Good morning', zh: '早上好' };
        }
        if (h >= 12 && h < 18) {
          return { period: 'afternoon' as const, emoji: '🌤️', en: 'Good afternoon', zh: '下午好' };
        }
        // Evening covers 18:00 to 04:59 (includes night)
        return { period: 'evening' as const, emoji: '🌆', en: 'Good evening', zh: '晚上好' };
      };

      const { period: timePeriod, emoji, en: greetingEn, zh: greetingZh } = getGreetingByHour(hour);
      const greeting = `${greetingEn} ${emoji}`;

      // Check if we've already sent a greeting for this time period today
      const greetingKey = `greeting_${user.uid}_${dateKey}_${timePeriod}`;
      const alreadySent = localStorage.getItem(greetingKey);

      if (!alreadySent) {
        try {
          const userName = user.displayName || userProfile?.displayName || 'friend';
          const isWeekend = now.getDay() === 0 || now.getDay() === 6;

          // Create personalized message with day context
          let message: string;
          if (isWeekend) {
            message = `${greeting}, ${userName}! Happy ${dayOfWeek}! Perfect time to explore and add new memories to your map. 🗺️`;
          } else {
            message = `${greeting}, ${userName}! It's ${dayOfWeek}. Ready to discover some new places today? 🌟`;
          }

          await createNotification({
            recipientUid: user.uid,
            type: 'welcome',
            message
          });

          localStorage.setItem(greetingKey, 'true');
          setHasShownGreeting(true);
        } catch (error) {
          console.error('Failed to send greeting notification:', error);
        }
      } else {
        setHasShownGreeting(true);
      }
    };

    sendGreetingNotification();
  }, [user, userProfile, hasShownGreeting, createNotification]);

  // Menu handlers
  const closeMenu = useCallback(() => {
    setIsMenuClosing(true);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsMenuClosing(false);
      setIsMenuAnimatingIn(false);
    }, 300);
  }, []);

  const handleMenuToggle = useCallback(() => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      setIsMenuOpen(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsMenuAnimatingIn(true);
        });
      });
    }
  }, [isMenuOpen, closeMenu]);

  // User detail handlers
  const closeUserDetail = useCallback(() => {
    setIsUserDetailClosing(true);
    setTimeout(() => {
      setIsUserDetailOpen(false);
      setIsUserDetailClosing(false);
    }, 200);
  }, []);

  // Login handlers
  const handleLogin = useCallback(async () => {
    try {
      await login();
    } catch (error) {
      alert("Login failed. Please try again.");
    }
  }, [login]);

  const handleGuestLogin = useCallback(async () => {
    try {
      const demoMap = await loginAsGuest();
      setActiveMap(demoMap);
      setViewState(ViewState.MAP);
    } catch (error) {
      console.error("Guest login failed:", error);
    }
  }, [loginAsGuest, setActiveMap]);

  const handleLogout = useCallback(async () => {
    await logout();
    setViewState(ViewState.LOGIN);
  }, [logout]);

  const handleRefreshStatus = useCallback(async () => {
    const result = await refreshStatus();
    if (result.emailVerified && result.approved) {
      setViewState(ViewState.MAP);
    }
  }, [refreshStatus]);

  // Place handlers
  const handleSaveVisit = useCallback(async (placeInfo: Place, visit: Visit) => {
    try {
      await saveVisit(placeInfo, visit);
      setViewState(ViewState.MAP);
      setHideAddButton(false);
    } catch (e) {
      console.error("Error saving to Firestore:", e);
      alert("Failed to save memory. Check your internet connection.");
    }
  }, [saveVisit]);

  const handleUpdateVisit = useCallback(async (placeId: string, oldVisit: Visit, newVisit: Visit) => {
    try {
      await updateVisit(placeId, oldVisit, newVisit);
      setEditingData(null);
      setViewState(ViewState.PLACE_DETAIL);
    } catch (e) {
      console.error("Error updating visit:", e);
      alert("Failed to update memory.");
    }
  }, [updateVisit]);

  const handleDeleteVisit = useCallback(async (place: Place, visitToDelete: Visit) => {
    try {
      const wasDeleted = await deleteVisit(place, visitToDelete);
      if (wasDeleted) {
        setViewState(ViewState.MAP);
      }
    } catch (e) {
      console.error("Error deleting visit:", e);
      alert("Failed to delete memory.");
    }
  }, [deleteVisit]);

  const handleClearDatabase = useCallback(async () => {
    if (!window.confirm("WARNING: This will delete ALL experiences from the database. This action cannot be undone. Are you sure?")) {
      return;
    }
    try {
      await clearDatabase();
      alert("Database has been reset successfully.");
      setViewState(ViewState.MAP);
    } catch (e) {
      console.error("Error clearing database:", e);
      alert("Failed to clear database.");
    }
  }, [clearDatabase]);

  const handleEditTrigger = useCallback((r: Place, v: Visit) => {
    setEditingData({ place: r, visit: v });
    setViewState(ViewState.EDIT_ENTRY);
  }, []);

  const handleMarkerClick = useCallback((r: Place) => {
    setSelectedPlace(r);
    setViewState(ViewState.PLACE_DETAIL);
  }, [setSelectedPlace]);

  const handleToggleAdd = useCallback(() => {
    if (viewState === ViewState.ADD_ENTRY) {
      // Trigger closing animation
      setIsAddModalClosing(true);
      setTimeout(() => {
        setViewState(ViewState.MAP);
        setHideAddButton(false);
        setIsAddModalClosing(false);
      }, 200);
    } else {
      setViewState(ViewState.ADD_ENTRY);
    }
  }, [viewState]);

  // Handler for when modal closes itself (via X button in modal header)
  const handleAddModalClose = useCallback(() => {
    setViewState(ViewState.MAP);
    setHideAddButton(false);
    setIsAddModalClosing(false);
  }, []);

  // Search select handler (map-aware)
  const onSearchSelect = useCallback((place: Place, map: UserMap) => {
    closeSearch();
    // Switch maps if needed, then select once loaded
    if (map.id !== activeMap?.id) {
      setPendingSearchSelection({ place, map });
      setActiveMap(map);
      // Show toast notification for map switch with map visibility and owner
      const visibility = map.visibility === 'public' ? 'public' : map.isDefault ? 'private' : 'shared';
      // Get owner display name
      let ownerName: string | undefined;
      if (map.visibility !== 'public' && !map.isDefault) {
        // For shared maps, show owner name
        ownerName = map.ownerDisplayName || map.ownerEmail?.split('@')[0];
      }
      setMapSwitchToast({ 
        visible: true, 
        mapName: map.name, 
        mapOwner: ownerName,
        mapVisibility: visibility 
      });
      return;
    }

    handleSearchSelect(place, mapInstance, (r) => {
      setSelectedPlace(r);
      setViewState(ViewState.PLACE_DETAIL);
    });
  }, [activeMap?.id, closeSearch, handleSearchSelect, mapInstance, setSelectedPlace, setActiveMap]);

  // Apply pending selection when map data arrives
  React.useEffect(() => {
    if (!pendingSearchSelection) return;
    if (!activeMap || activeMap.id !== pendingSearchSelection.map.id) return;

    const match = places.find(r => r.id === pendingSearchSelection.place.id);
    if (!match) return;

    handleSearchSelect(match, mapInstance, (r) => {
      setSelectedPlace(r);
      setViewState(ViewState.PLACE_DETAIL);
    });
    setPendingSearchSelection(null);
  }, [activeMap, pendingSearchSelection, places, handleSearchSelect, mapInstance, setSelectedPlace]);

  // Map click handler
  const handleMapClick = useCallback(() => {
    if (isFilterOpen) {
      closeFilter();
    }
    if (isSearchFocused || searchQuery) {
      closeSearch();
    }
    setIsCompactCardOpen(false);
    // Reset map controls click state
    mapControlsRef.current?.resetClickState();
  }, [isFilterOpen, closeFilter, isSearchFocused, searchQuery, closeSearch]);

  // Check if we should show the map view
  const showMapView = useMemo(() => {
    // Only show map when on map navigation page
    if (currentNavPage !== 'map') return false;
    
    return [
      ViewState.MAP,
      ViewState.PLACE_DETAIL,
      ViewState.ADD_ENTRY,
      ViewState.EDIT_ENTRY,
      ViewState.INFO,
      ViewState.STATS,
      ViewState.USER_HISTORY,
      ViewState.SITE_MANAGEMENT,
      ViewState.MAP_MANAGEMENT
    ].includes(viewState);
  }, [viewState, currentNavPage]);

  const isAddModalOpen = viewState === ViewState.ADD_ENTRY;

  // RENDER

  if (viewState === ViewState.PENDING) {
    const emailVerified = user?.emailVerified ?? userProfile?.emailVerified ?? false;
    const adminApproved = userProfile?.status === 'approved';
    
    return (
      <PendingScreen
        isCheckingStatus={isCheckingStatus}
        emailVerified={emailVerified}
        adminApproved={adminApproved}
        onRefreshStatus={handleRefreshStatus}
        onResendVerification={resendVerificationEmail}
        onLogout={handleLogout}
      />
    );
  }

  if (viewState === ViewState.LOGIN) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onGuestLogin={handleGuestLogin}
        onEmailLogin={loginWithEmail}
        onEmailSignUp={signUpWithEmail}
      />
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-gray-900">
      {showMapView && (
        <>
          {/* Top Center Controls */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
            <HeaderBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isSearchFocused={isSearchFocused}
              setIsSearchFocused={setIsSearchFocused}
              isSearchClosing={isSearchClosing}
              searchInputRef={searchInputRef}
              closeSearch={closeSearch}
              onSearchSelect={onSearchSelect}
              selectedGrades={selectedGrades}
              isFilterOpen={isFilterOpen}
              isFilterClosing={isFilterClosing}
              onToggleGradeFilter={toggleGradeFilter}
              onSelectAllGrades={selectAllGrades}
              onClearAllGrades={clearAllGrades}
              onFilterToggle={handleFilterToggle}
              closeFilter={closeFilter}
              onMenuToggle={handleMenuToggle}
              isMenuOpen={isMenuOpen}
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              showNotifications={!user?.isAnonymous}
            isAdmin={isAdmin}
            isGuest={isGuestUser}
            currentUserUid={user?.uid}
          />

            {/* Map Selector Pill - Always render for guests with fallback */}
            {user && (activeMap || user.isAnonymous) && (
              <MapSelectorPill
                activeMap={activeMap || {
                  id: 'guest-demo-map',
                  ownerUid: 'demo-owner',
                  ownerDisplayName: 'Demo',
                  name: 'Demo Map',
                  visibility: 'public',
                  isDefault: true,
                  createdAt: new Date().toISOString()
                }}
                user={user}
                userProfile={userProfile}
                userOwnMaps={userOwnMaps}
                userSharedMaps={userSharedMaps}
                userJoinedMaps={userJoinedMaps}
                allMaps={allMaps}
                isCompactCardOpen={isCompactCardOpen}
                setIsCompactCardOpen={setIsCompactCardOpen}
                onSelectMap={setActiveMap}
                onManageMaps={() => setViewState(ViewState.MAP_MANAGEMENT)}
                placesCount={places.length}
                filteredCount={filteredPlaces.length}
              />
            )}
          </div>

          <MapContainer
            apiKey={GOOGLE_MAPS_API_KEY}
            places={filteredPlaces}
            onMapLoad={handleMapLoad}
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
            mapType={mapType}
          />

          {/* User Location Marker */}
          <UserLocationMarker
            map={mapInstance}
            user={user}
            userPhotoURL={userProfile?.photoURL}
          />

          {/* Bottom Right Map Controls */}
          <MapControls
            ref={mapControlsRef}
            mapType={mapType}
            onLocateUser={handleLocateMe}
            onZoomToCity={handleZoomToMunicipality}
            onToggleMapType={handleToggleMapType}
          />

          {/* Member Avatars */}
          {activeMap && <MemberAvatars activeMap={activeMap} />}
        </>
      )}

      {/* Navigation Island - replaces AddButton */}
      {user && (
        <NavigationIsland
          currentPage={currentNavPage}
          onNavigate={handleNavigation}
          onAddPress={handleToggleAdd}
          isAddModalOpen={isAddModalOpen}
          hideNavigation={hideAddButton}
          isModalActive={viewState === ViewState.PLACE_DETAIL || viewState === ViewState.INFO || viewState === ViewState.STATS || viewState === ViewState.USER_HISTORY || viewState === ViewState.MAP_MANAGEMENT || viewState === ViewState.EDIT_ENTRY || viewState === ViewState.SITE_MANAGEMENT}
        />
      )}

      {/* Friends Page */}
      <FriendsPage
        isVisible={friendsPageVisible}
        animationDirection={friendsAnimationDirection}
        isAnimatingOut={friendsAnimatingOut}
      />

      {/* Feeds Page */}
      <FeedsPage
        isVisible={feedsPageVisible}
        animationDirection={feedsAnimationDirection}
        isAnimatingOut={feedsAnimatingOut}
      />

      {/* Side Menu */}
      {user && (
        <SideMenu
          user={user}
          userProfile={userProfile}
          isMenuOpen={isMenuOpen}
          isMenuClosing={isMenuClosing}
          isMenuAnimatingIn={isMenuAnimatingIn}
          onClose={closeMenu}
          onOpenUserDetail={() => setIsUserDetailOpen(true)}
          onViewStats={() => setViewState(ViewState.STATS)}
          onManageMaps={() => {
            setIsCompactCardOpen(false);
            setViewState(ViewState.MAP_MANAGEMENT);
          }}
          onViewInfo={() => setViewState(ViewState.INFO)}
          onSiteManagement={() => setViewState(ViewState.SITE_MANAGEMENT)}
          onStartTutorial={handleStartTutorial}
        />
      )}

      {/* User Detail Modal */}
      {user && (
        <UserDetailModal
          user={user}
          userProfile={userProfile}
          isOpen={isUserDetailOpen}
          isClosing={isUserDetailClosing}
          onClose={closeUserDetail}
          onViewHistory={() => setViewState(ViewState.USER_HISTORY)}
          onLogout={handleLogout}
          onUpdateProfile={updateUserProfile}
        />
      )}

      {/* Modals */}
      {(viewState === ViewState.ADD_ENTRY || isAddModalClosing) && (
        <AddVisitModal
          mapInstance={mapInstance}
          currentLocation={currentMapCenter}
          existingPlaces={places}
          onClose={handleAddModalClose}
          onSave={handleSaveVisit}
          onPhotosUploaded={(hasPhotos) => setHideAddButton(hasPhotos)}
          isGuest={user?.uid === 'guest-user' || user?.isAnonymous || false}
          externalIsClosing={isAddModalClosing}
        />
      )}

      {viewState === ViewState.EDIT_ENTRY && editingData && (
        <EditVisitModal
          place={editingData.place}
          visit={editingData.visit}
          onClose={() => {
            setEditingData(null);
            setViewState(ViewState.PLACE_DETAIL);
          }}
          onSave={handleUpdateVisit}
        />
      )}

      {viewState === ViewState.PLACE_DETAIL && selectedPlace && (
        <PlaceDetail
          place={selectedPlace}
          currentUserUid={user?.uid}
          onClose={() => {
            setSelectedPlace(null);
            setViewState(ViewState.MAP);
          }}
          onAddAnotherVisit={() => setViewState(ViewState.ADD_ENTRY)}
          onDeleteVisit={handleDeleteVisit}
          onEditVisit={handleEditTrigger}
        />
      )}

      {viewState === ViewState.INFO && (
        <InfoModal
          onClose={() => setViewState(ViewState.MAP)}
        />
      )}

      {viewState === ViewState.USER_HISTORY && user && (
        <UserHistoryModal
          places={places}
          currentUserUid={user.uid}
          onClose={() => setViewState(ViewState.MAP)}
          onSelectVisit={(r) => {
            setSelectedPlace(r);
            setViewState(ViewState.PLACE_DETAIL);
          }}
        />
      )}

      {viewState === ViewState.STATS && (
        <StatsModal
          places={places}
          onClose={() => setViewState(ViewState.MAP)}
        />
      )}

      {viewState === ViewState.MAP_MANAGEMENT && user && (
        <MapManagementModal
          userMaps={user.isAnonymous ? [activeMap!].filter(Boolean) : userOwnMaps.filter(m => m.isDefault)}
          sharedMaps={user.isAnonymous ? [] : userSharedMaps}
          joinedMaps={user.isAnonymous ? [] : userJoinedMaps}
          activeMap={activeMap}
          currentUserUid={user.uid}
          isGuest={user.isAnonymous || false}
          onClose={() => setViewState(ViewState.MAP)}
          onCreateSharedMap={createSharedMap}
          onJoinSharedMap={joinSharedMap}
          onLeaveSharedMap={leaveSharedMap}
          onKickMember={kickMember}
          onSelectMap={(map) => {
            setActiveMap(map);
          }}
        />
      )}

      {viewState === ViewState.SITE_MANAGEMENT && userProfile?.role === 'admin' && (
        <SiteManagementModal
          onClose={() => setViewState(ViewState.MAP)}
        />
      )}

      {/* Floating Tutorial Button for Guest Users - Above map controls, right aligned */}
      {user?.isAnonymous && !isTutorialActive && showMapView && (
        <div className="fixed bottom-72 right-4 z-30">
          <TutorialButton onClick={handleStartTutorial} isGuestUser={true} />
        </div>
      )}

      {/* Tutorial Overlay */}
      <Tutorial
        isActive={isTutorialActive}
        onClose={handleTutorialComplete}
        onOpenMapManagement={handleOpenMapManagementForTutorial}
        onCloseMapManagement={() => {
          // Close map management modal - only if open
          if (viewState === ViewState.MAP_MANAGEMENT) {
            setViewState(ViewState.MAP);
          }
          // Close the compact card - only if open
          if (isCompactCardOpen) {
            setIsCompactCardOpen(false);
          }
          // Close side menu - only if open (prevents flicker)
          if (isMenuOpen) {
            setIsMenuClosing(true);
            setTimeout(() => {
              setIsMenuOpen(false);
              setIsMenuClosing(false);
              setIsMenuAnimatingIn(false);
            }, 300);
          }
          // Close filter only if open (prevents flicker)
          if (isFilterOpen) {
            closeFilter();
          }
          // Close search only if open
          closeSearch();
        }}
        isGuestUser={user?.isAnonymous || false}
      />

      {/* Map Switch Toast with Glass Blur Effect */}
      <Toast
        message="Switching to"
        mapName={mapSwitchToast.mapName}
        mapOwner={mapSwitchToast.mapOwner}
        mapVisibility={mapSwitchToast.mapVisibility}
        isVisible={mapSwitchToast.visible}
        onHide={() => setMapSwitchToast({ visible: false, mapName: '' })}
        duration={1800}
        isMapSwitch={true}
      />
    </div>
  );
}

export default App;
