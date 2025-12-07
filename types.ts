/**
 * TraceBook Types - Mapbox GL Version
 * 
 * This file contains type definitions for the app.
 * Google Maps types have been removed in favor of Mapbox GL JS types.
 * Import mapbox-gl types directly where needed: import mapboxgl from 'mapbox-gl';
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Visit {
  id: string;
  date: string;
  photoDataUrl: string; // Primary thumbnail (backward compatibility)
  photos?: string[]; // Array of all photo URLs
  rating: string; // Grade: S, A, B, C, D, E
  comment: string;
  createdBy?: string; // User UID
  creatorName?: string; // User Display Name
  creatorPhotoURL?: string | null; // User Profile Picture
}

export interface Place {
  id: string; // Place ID (Foursquare fsq_id or internal ID)
  name: string;
  address: string;
  location: Coordinates;
  visits: Visit[];
}

export const GUEST_ID = 'guest-user';

export interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  emailVerified?: boolean;
  role: 'user' | 'admin';
  createdAt: string;
  joinedMaps?: string[]; // Array of map IDs user has joined
}

/**
 * PlaceResult - Compatible type for place search results
 * Works with both Foursquare and Mapbox Geocoding APIs
 */
export interface PlaceResult {
  place_id?: string;
  name?: string;
  vicinity?: string;
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  // Optional additional fields
  types?: string[];
  icon?: string;
  distance?: number;
}

export interface MapMember {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  joinedAt?: string;
}

export interface UserMap {
  id: string;
  ownerUid: string;
  ownerDisplayName?: string;
  ownerEmail?: string; // Owner's email for fallback display
  ownerPhotoURL?: string | null; // Owner's profile picture URL
  name: string; // e.g. "Default Map"
  visibility: 'private' | 'public' | 'shared';
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
  shareCode?: string; // 4-digit unique code for shared maps
  members?: string[]; // Array of user UIDs who have access to this shared map
  memberInfo?: MapMember[]; // Detailed member information
}

// Notification system
export type NotificationType =
  | 'member_joined'      // Someone joined a shared map you're in
  | 'member_left'        // Someone left a shared map you're in
  | 'member_removed'     // You were removed from a shared map
  | 'join_approved'      // Your account was approved
  | 'post_added'         // Someone added a post to your shared map
  | 'post_deleted'       // Someone deleted a post from your shared map
  | 'map_invite'         // You were invited to a map (future feature)
  | 'welcome'            // Welcome notification when user first joins
  | 'system';            // System announcements

export interface AppNotification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  mapId?: string;
  mapName?: string;
  actorUid?: string;
  actorName?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export enum ViewState {
  LOGIN = 'LOGIN',
  PENDING = 'PENDING',
  MAP = 'MAP',
  ADD_ENTRY = 'ADD_ENTRY',
  PLACE_DETAIL = 'PLACE_DETAIL',
  INFO = 'INFO',
  USER_HISTORY = 'USER_HISTORY',
  EDIT_ENTRY = 'EDIT_ENTRY',
  STATS = 'STATS',
  MAP_MANAGEMENT = 'MAP_MANAGEMENT',
  SITE_MANAGEMENT = 'SITE_MANAGEMENT',
}

/**
 * Type alias for Mapbox Map instance
 * Use: import mapboxgl from 'mapbox-gl'; 
 *      const map: MapboxMap = new mapboxgl.Map({...})
 */
export type MapboxMap = import('mapbox-gl').Map;
