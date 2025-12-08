import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Place, Visit, UserMap, ViewState, UserProfile } from '../types';
import { AppUser } from './useAuth';

interface UsePlacesReturn {
  places: Place[];
  selectedPlace: Place | null;
  setSelectedPlace: (p: Place | null) => void;
  saveVisit: (placeInfo: Place, visit: Visit) => Promise<void>;
  updateVisit: (placeId: string, oldVisit: Visit, newVisit: Visit) => Promise<void>;
  deleteVisit: (place: Place, visitToDelete: Visit) => Promise<boolean>;
  clearDatabase: () => Promise<void>;
}

export function usePlaces(
  user: AppUser | null,
  userProfile: UserProfile | null,
  activeMap: UserMap | null,
  viewState: ViewState,
  onViewStateChange: (state: ViewState) => void
): UsePlacesReturn {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Data fetching subscription
  useEffect(() => {
    if (!user || viewState === ViewState.PENDING || viewState === ViewState.LOGIN) return;
    if (!activeMap) return;

    // Note: Firestore collection is named 'restaurants' for backward compatibility
    const placesRef = collection(db, 'maps', activeMap.id, 'restaurants');

    const unsubscribe = onSnapshot(placesRef, (snapshot) => {
      const fetchedPlaces: Place[] = [];
      const docsToDelete: any[] = [];

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Place;
        if (!data.visits || data.visits.length === 0) {
          docsToDelete.push(docSnapshot.ref);
        } else {
          fetchedPlaces.push(data);
        }
      });

      // Delete empty places after processing snapshot
      if (docsToDelete.length > 0) {
        Promise.all(docsToDelete.map(ref => deleteDoc(ref)))
          .catch(e => console.error("Auto-cleanup error:", e));
      }

      setPlaces(fetchedPlaces);

      // Update selected place if it exists
      setSelectedPlace(prev => {
        if (!prev) return null;
        const updated = fetchedPlaces.find(p => p.id === prev.id);
        if (updated) {
          return updated;
        } else {
          onViewStateChange(ViewState.MAP);
          return null;
        }
      });
    }, (error) => {
      console.error("Error fetching data:", error);
    });

    return () => unsubscribe();
  }, [user, viewState, activeMap, onViewStateChange]);

  // Helper function to calculate distance between two coordinates in meters
  const getDistanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Find a nearby existing place (within threshold meters)
  const findNearbyPlace = useCallback((location: { lat: number; lng: number }, threshold: number = 50): Place | null => {
    for (const place of places) {
      if (place.location) {
        const distance = getDistanceInMeters(
          location.lat, 
          location.lng, 
          place.location.lat, 
          place.location.lng
        );
        if (distance <= threshold) {
          return place;
        }
      }
    }
    return null;
  }, [places]);

  const saveVisit = useCallback(async (placeInfo: Place, visit: Visit) => {
    if (!user || !activeMap) throw new Error("No active user or map");

    // Build the best display name from all available sources
    // Priority: userProfile.displayName > user.displayName > user.email username > 'User'
    let creatorDisplayName = 'User';
    if (userProfile?.displayName && userProfile.displayName.trim()) {
      creatorDisplayName = userProfile.displayName;
    } else if (user.displayName && user.displayName.trim()) {
      creatorDisplayName = user.displayName;
    } else if (user.email) {
      // Use email username as fallback
      creatorDisplayName = user.email.split('@')[0];
    }

    // Build the best photo URL from all available sources
    const creatorPhotoURL = userProfile?.photoURL || user.photoURL || null;

    const fullVisit: Visit = {
      ...visit,
      createdBy: user.uid,
      creatorName: creatorDisplayName,
      creatorPhotoURL: creatorPhotoURL
    };

    // Check for nearby existing place (handles Google Maps vs Geoapify ID mismatch)
    // If there's a place within 50 meters, add the visit to that place instead
    const nearbyPlace = placeInfo.location ? findNearbyPlace(placeInfo.location, 50) : null;
    
    // Also check for exact ID match
    const existsById = places.some(p => p.id === placeInfo.id);

    // Note: Firestore collection is named 'restaurants' for backward compatibility
    if (nearbyPlace && !existsById) {
      // Found a nearby place with different ID - add visit to existing place
      const placeRef = doc(db, "maps", activeMap.id, "restaurants", nearbyPlace.id);
      await updateDoc(placeRef, { visits: arrayUnion(fullVisit) });
      console.log(`Added visit to nearby existing place: ${nearbyPlace.name} (was: ${placeInfo.name})`);
    } else if (existsById) {
      // Exact ID match - add visit to existing place
      const placeRef = doc(db, "maps", activeMap.id, "restaurants", placeInfo.id);
      await updateDoc(placeRef, { visits: arrayUnion(fullVisit) });
    } else {
      // New place - create it
      const placeRef = doc(db, "maps", activeMap.id, "restaurants", placeInfo.id);
      const newPlace = { ...placeInfo, visits: [fullVisit] };
      await setDoc(placeRef, newPlace);
    }

    // Send notifications to other members if this is a shared map
    const placeName = nearbyPlace ? nearbyPlace.name : placeInfo.name;
    if (activeMap.visibility === 'shared' && activeMap.members && activeMap.members.length > 1) {
      const notificationsRef = collection(db, 'notifications');
      const batch = writeBatch(db);

      activeMap.members.forEach((memberUid: string) => {
        // Don't notify the person who added the post
        if (memberUid !== user.uid) {
          const newNotifRef = doc(notificationsRef);
          batch.set(newNotifRef, {
            recipientUid: memberUid,
            type: 'post_added',
            message: `${creatorDisplayName} added a memory at "${placeName}" to "${activeMap.name}"`,
            mapId: activeMap.id,
            mapName: activeMap.name,
            actorUid: user.uid,
            actorName: creatorDisplayName,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      });

      await batch.commit();
    }
  }, [user, userProfile, activeMap, places, findNearbyPlace]);

  const updateVisit = useCallback(async (placeId: string, oldVisit: Visit, newVisit: Visit) => {
    if (!user || !activeMap) return;

    // Note: Firestore collection is named 'restaurants' for backward compatibility
    const placeRef = doc(db, "maps", activeMap.id, "restaurants", placeId);
    const placeDoc = await getDoc(placeRef);

    if (placeDoc.exists()) {
      const currentData = placeDoc.data() as Place;
      const updatedVisits = currentData.visits.map(v => v.id === oldVisit.id ? newVisit : v);
      await updateDoc(placeRef, { visits: updatedVisits });
    }
  }, [user, activeMap]);

  const deleteVisit = useCallback(async (place: Place, visitToDelete: Visit): Promise<boolean> => {
    if (!user || !activeMap) throw new Error("No active user or map");

    // Build the best display name from all available sources
    let creatorDisplayName = 'Someone';
    if (userProfile?.displayName && userProfile.displayName.trim()) {
      creatorDisplayName = userProfile.displayName;
    } else if (user.displayName && user.displayName.trim()) {
      creatorDisplayName = user.displayName;
    } else if (user.email) {
      creatorDisplayName = user.email.split('@')[0];
    }

    // Note: Firestore collection is named 'restaurants' for backward compatibility
    const placeRef = doc(db, "maps", activeMap.id, "restaurants", place.id);
    const placeDoc = await getDoc(placeRef);

    if (placeDoc.exists()) {
      const currentData = placeDoc.data() as Place;
      const updatedVisits = currentData.visits.filter(v => v.id !== visitToDelete.id);

      if (updatedVisits.length === 0) {
        await deleteDoc(placeRef);
        setSelectedPlace(null);

        // Send notifications for post deletion on shared map
        if (activeMap.visibility === 'shared' && activeMap.members && activeMap.members.length > 1) {
          const notificationsRef = collection(db, 'notifications');
          const batch = writeBatch(db);

          activeMap.members.forEach((memberUid: string) => {
            // Don't notify the person who deleted the post
            if (memberUid !== user.uid) {
              const newNotifRef = doc(notificationsRef);
              batch.set(newNotifRef, {
                recipientUid: memberUid,
                type: 'post_deleted',
                message: `${creatorDisplayName} removed a memory at "${place.name}" from "${activeMap.name}"`,
                mapId: activeMap.id,
                mapName: activeMap.name,
                actorUid: user.uid,
                actorName: creatorDisplayName,
                read: false,
                createdAt: serverTimestamp(),
              });
            }
          });

          await batch.commit();
        }

        return true; // Place was deleted
      } else {
        await updateDoc(placeRef, { visits: updatedVisits });

        // Send notifications for post deletion on shared map
        if (activeMap.visibility === 'shared' && activeMap.members && activeMap.members.length > 1) {
          const notificationsRef = collection(db, 'notifications');
          const batch = writeBatch(db);

          activeMap.members.forEach((memberUid: string) => {
            // Don't notify the person who deleted the post
            if (memberUid !== user.uid) {
              const newNotifRef = doc(notificationsRef);
              batch.set(newNotifRef, {
                recipientUid: memberUid,
                type: 'post_deleted',
                message: `${creatorDisplayName} removed a memory at "${place.name}" from "${activeMap.name}"`,
                mapId: activeMap.id,
                mapName: activeMap.name,
                actorUid: user.uid,
                actorName: creatorDisplayName,
                read: false,
                createdAt: serverTimestamp(),
              });
            }
          });

          await batch.commit();
        }

        return false; // Place still exists
      }
    }
    return false;
  }, [user, userProfile, activeMap]);

  const clearDatabase = useCallback(async () => {
    if (!activeMap) return;

    // Note: Firestore collection is named 'restaurants' for backward compatibility
    const deletePromises = places.map(p =>
      deleteDoc(doc(db, "maps", activeMap.id, "restaurants", p.id))
    );
    await Promise.all(deletePromises);
  }, [activeMap, places]);

  return {
    places,
    selectedPlace,
    setSelectedPlace,
    saveVisit,
    updateVisit,
    deleteVisit,
    clearDatabase
  };
}
