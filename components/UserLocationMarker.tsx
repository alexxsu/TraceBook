import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

// Simple user interface matching what App.tsx provides
interface SimpleUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  isAnonymous?: boolean;
}

interface UserLocationMarkerProps {
  map: mapboxgl.Map | null;
  user: SimpleUser | null;
  userPhotoURL?: string | null;
}

// Create the user marker element
const createUserMarkerElement = (
  photoURL: string | null,
  initial: string,
  isGuest: boolean,
  onClick: () => void
): HTMLDivElement => {
  const container = document.createElement('div');
  container.className = 'user-location-marker';
  container.style.cssText = `
    cursor: pointer;
    z-index: 1000;
  `;

  const innerContent = isGuest
    ? `<img src="/logo.svg" alt="Guest" style="width: 80%; height: 80%; object-fit: contain; padding: 2px;" />`
    : photoURL
      ? `<img src="${photoURL}" alt="You" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <span style="display: none; color: white; font-weight: 600; font-size: 14px;">${initial}</span>`
      : `<span style="color: white; font-weight: 600; font-size: 14px;">${initial}</span>`;

  container.innerHTML = `
    <div class="user-marker-wrapper" style="position: relative;">
      <style>
        @keyframes userPulseRing {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
        @keyframes userGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); }
          50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.9); }
        }
        .user-marker-pulse {
          animation: userPulseRing 2s ease-out infinite;
        }
        .user-marker-glow {
          animation: userGlow 2s ease-in-out infinite;
        }
        .user-marker-click {
          animation: userMarkerClick 0.4s ease-out;
        }
        @keyframes userMarkerClick {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      </style>
      
      <!-- Pulsing ring -->
      <div class="user-marker-pulse" style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.3);
        pointer-events: none;
      "></div>
      
      <!-- Profile container -->
      <div class="profile-ring user-marker-glow" style="
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        padding: 3px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      ">
        <div style="
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          background: #1f2937;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        ">
          ${innerContent}
        </div>
      </div>
    </div>
  `;

  container.addEventListener('click', (e) => {
    e.stopPropagation();
    const profileRing = container.querySelector('.profile-ring');
    if (profileRing) {
      profileRing.classList.add('user-marker-click');
      setTimeout(() => profileRing.classList.remove('user-marker-click'), 400);
    }
    onClick();
  });

  return container;
};

export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({
  map,
  user,
  userPhotoURL
}) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Get user's location
  useEffect(() => {
    if (!navigator.geolocation) return;

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (error) => {
        console.warn('Could not get user location:', error);
      },
      { enableHighAccuracy: true }
    );

    // Watch for position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (error) => {
        console.warn('Location watch error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Handle marker click
  const handleClick = useCallback(() => {
    console.log('User location marker clicked');
  }, []);

  // Create/update marker
  useEffect(() => {
    if (!map || !position) return;

    const photoURL = userPhotoURL || user?.photoURL || null;
    const displayName = user?.displayName || user?.email?.charAt(0).toUpperCase() || '?';
    const initial = displayName.charAt(0).toUpperCase();
    const isGuest = user?.uid === 'guest-user';

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create new marker
    const element = createUserMarkerElement(photoURL, initial, isGuest, handleClick);
    const marker = new mapboxgl.Marker({ element, anchor: 'center' })
      .setLngLat([position.lng, position.lat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, position, user, userPhotoURL, handleClick]);

  // Update position when it changes
  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.setLngLat([position.lng, position.lat]);
    }
  }, [position]);

  return null;
};

export default UserLocationMarker;
