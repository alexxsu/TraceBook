import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Restaurant, Visit, UserMap, ViewState } from '../types';
import { AppUser } from './useAuth';

interface UseRestaurantsReturn {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  setSelectedRestaurant: (r: Restaurant | null) => void;
  saveVisit: (restaurantInfo: Restaurant, visit: Visit) => Promise<void>;
  updateVisit: (restaurantId: string, oldVisit: Visit, newVisit: Visit) => Promise<void>;
  deleteVisit: (restaurant: Restaurant, visitToDelete: Visit) => Promise<boolean>;
  clearDatabase: () => Promise<void>;
}

export function useRestaurants(
  user: AppUser | null,
  activeMap: UserMap | null,
  viewState: ViewState,
  onViewStateChange: (state: ViewState) => void
): UseRestaurantsReturn {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Data fetching subscription
  useEffect(() => {
    if (!user || viewState === ViewState.PENDING || viewState === ViewState.LOGIN) return;
    if (!activeMap) return;

    const restaurantsRef = collection(db, 'maps', activeMap.id, 'restaurants');

    const unsubscribe = onSnapshot(restaurantsRef, (snapshot) => {
      const fetchedRestaurants: Restaurant[] = [];
      const docsToDelete: any[] = [];

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Restaurant;
        if (!data.visits || data.visits.length === 0) {
          docsToDelete.push(docSnapshot.ref);
        } else {
          fetchedRestaurants.push(data);
        }
      });

      // Delete empty restaurants after processing snapshot
      if (docsToDelete.length > 0) {
        Promise.all(docsToDelete.map(ref => deleteDoc(ref)))
          .catch(e => console.error("Auto-cleanup error:", e));
      }

      setRestaurants(fetchedRestaurants);

      // Update selected restaurant if it exists
      setSelectedRestaurant(prev => {
        if (!prev) return null;
        const updated = fetchedRestaurants.find(r => r.id === prev.id);
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

  const saveVisit = useCallback(async (restaurantInfo: Restaurant, visit: Visit) => {
    if (!user || !activeMap) throw new Error("No active user or map");

    const fullVisit: Visit = {
      ...visit,
      createdBy: user.uid,
      creatorName: user.displayName || 'Anonymous',
      creatorPhotoURL: user.photoURL
    };

    const restaurantRef = doc(db, "maps", activeMap.id, "restaurants", restaurantInfo.id);
    const exists = restaurants.some(r => r.id === restaurantInfo.id);

    if (exists) {
      await updateDoc(restaurantRef, { visits: arrayUnion(fullVisit) });
    } else {
      const newRestaurant = { ...restaurantInfo, visits: [fullVisit] };
      await setDoc(restaurantRef, newRestaurant);
    }
  }, [user, activeMap, restaurants]);

  const updateVisit = useCallback(async (restaurantId: string, oldVisit: Visit, newVisit: Visit) => {
    if (!user || !activeMap) return;

    const restaurantRef = doc(db, "maps", activeMap.id, "restaurants", restaurantId);
    const restaurantDoc = await getDoc(restaurantRef);

    if (restaurantDoc.exists()) {
      const currentData = restaurantDoc.data() as Restaurant;
      const updatedVisits = currentData.visits.map(v => v.id === oldVisit.id ? newVisit : v);
      await updateDoc(restaurantRef, { visits: updatedVisits });
    }
  }, [user, activeMap]);

  const deleteVisit = useCallback(async (restaurant: Restaurant, visitToDelete: Visit): Promise<boolean> => {
    if (!activeMap) throw new Error("No active map");

    const restaurantRef = doc(db, "maps", activeMap.id, "restaurants", restaurant.id);
    const restaurantDoc = await getDoc(restaurantRef);

    if (restaurantDoc.exists()) {
      const currentData = restaurantDoc.data() as Restaurant;
      const updatedVisits = currentData.visits.filter(v => v.id !== visitToDelete.id);

      if (updatedVisits.length === 0) {
        await deleteDoc(restaurantRef);
        setSelectedRestaurant(null);
        return true; // Restaurant was deleted
      } else {
        await updateDoc(restaurantRef, { visits: updatedVisits });
        return false; // Restaurant still exists
      }
    }
    return false;
  }, [activeMap]);

  const clearDatabase = useCallback(async () => {
    if (!activeMap) return;

    const deletePromises = restaurants.map(r =>
      deleteDoc(doc(db, "maps", activeMap.id, "restaurants", r.id))
    );
    await Promise.all(deletePromises);
  }, [activeMap, restaurants]);

  return {
    restaurants,
    selectedRestaurant,
    setSelectedRestaurant,
    saveVisit,
    updateVisit,
    deleteVisit,
    clearDatabase
  };
}
