import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';

interface UserLocationMarkerProps {
  map: google.maps.Map | null;
  user: User | null;
  userPhotoURL?: string | null;
}

// Custom overlay class for user location
const getCustomUserOverlayClass = () => {
  if (!(window as any).google?.maps?.OverlayView) {
    return null;
  }

  class CustomUserOverlay extends google.maps.OverlayView {
    private position: google.maps.LatLng;
    private container: HTMLDivElement | null = null;
    private photoURL: string | null;
    private initial: string;
    private onClick: () => void;

    constructor(
      position: google.maps.LatLng,
      photoURL: string | null,
      initial: string,
      onClick: () => void
    ) {
      super();
      this.position = position;
      this.photoURL = photoURL;
      this.initial = initial;
      this.onClick = onClick;
    }

    onAdd() {
      this.container = document.createElement('div');
      this.container.style.position = 'absolute';
      this.container.style.cursor = 'pointer';
      this.container.style.zIndex = '1000';
      
      this.container.innerHTML = `
        <div class="user-marker-wrapper" style="
          position: relative;
          transform: translate(-50%, -50%);
        ">
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
              ${this.photoURL 
                ? `<img src="${this.photoURL}" alt="You" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                   <span style="display: none; color: white; font-weight: 600; font-size: 14px;">${this.initial}</span>`
                : `<span style="color: white; font-weight: 600; font-size: 14px;">${this.initial}</span>`
              }
            </div>
          </div>
        </div>
      `;

      this.container.addEventListener('click', (e) => {
        e.stopPropagation();
        const profileRing = this.container?.querySelector('.profile-ring');
        if (profileRing) {
          profileRing.classList.add('user-marker-click');
          setTimeout(() => profileRing.classList.remove('user-marker-click'), 400);
        }
        this.onClick();
      });

      const panes = this.getPanes();
      panes?.floatPane.appendChild(this.container);
    }

    draw() {
      if (!this.container) return;
      
      const overlayProjection = this.getProjection();
      if (!overlayProjection) return;
      
      const pos = overlayProjection.fromLatLngToDivPixel(this.position);
      if (pos) {
        this.container.style.left = pos.x + 'px';
        this.container.style.top = pos.y + 'px';
      }
    }

    onRemove() {
      if (this.container?.parentNode) {
        this.container.parentNode.removeChild(this.container);
        this.container = null;
      }
    }

    updatePosition(position: google.maps.LatLng) {
      this.position = position;
      this.draw();
    }
  }

  return CustomUserOverlay;
};

export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({
  map,
  user,
  userPhotoURL
}) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const overlayRef = useRef<any>(null);
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

  // Create/update overlay
  useEffect(() => {
    if (!map || !position) return;

    const OverlayClass = getCustomUserOverlayClass();
    if (!OverlayClass) return;

    // Get photo URL or use initials
    const photoURL = userPhotoURL || user?.photoURL || null;
    const displayName = user?.displayName || user?.email?.charAt(0).toUpperCase() || '?';
    const initial = displayName.charAt(0).toUpperCase();

    // Remove existing overlay
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
    }

    // Create new overlay
    const latLng = new google.maps.LatLng(position.lat, position.lng);
    const overlay = new OverlayClass(latLng, photoURL, initial, handleClick);
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [map, position, user, userPhotoURL, handleClick]);

  // Update position when it changes
  useEffect(() => {
    if (overlayRef.current && position) {
      const latLng = new google.maps.LatLng(position.lat, position.lng);
      overlayRef.current.updatePosition(latLng);
    }
  }, [position]);

  return null;
};

export default UserLocationMarker;
