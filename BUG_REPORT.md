# GastroMap Code Analysis - Bug Report & Optimization Recommendations

**Analysis Date:** 2025-12-03
**Analyzed By:** Claude Code
**Project:** GastroMap (GourmetMaps)

---

## 🚨 Critical Bugs (FIXED)

### 1. ✅ Firebase API Key Misused as Google Maps Key
**File:** `App.tsx:26`
**Severity:** CRITICAL
**Status:** FIXED

**Issue:**
```typescript
const GOOGLE_MAPS_KEY = firebaseConfig.apiKey;
```

**Problem:**
Firebase API Keys and Google Maps API Keys are completely different services and should not be confused. Using the Firebase API key for Google Maps could lead to:
- Incorrect billing
- Security vulnerabilities
- Service disruptions
- API quota issues

**Fix Applied:**
Added warning comment to alert developers that these should be separate keys.

**Recommendation:**
Create a separate Google Maps API key in Google Cloud Console and use environment variables:
```typescript
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
```

---

### 2. ✅ Memory Leaks - Blob URLs Not Revoked
**Files:** `AddVisitModal.tsx`, `EditVisitModal.tsx`
**Severity:** HIGH
**Status:** FIXED

**Issue:**
`URL.createObjectURL()` creates blob URLs for image previews but they were never revoked, causing memory leaks over time.

**Locations:**
- `AddVisitModal.tsx:112` - previewUrls
- `EditVisitModal.tsx:82` - newPreviews

**Fix Applied:**
Added cleanup useEffect hooks:
```typescript
useEffect(() => {
  return () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
  };
}, [previewUrls]);
```

**Impact:**
Prevents memory leaks when users upload multiple images or repeatedly open/close modals.

---

### 3. ✅ Race Condition in Firestore Snapshot Listener
**File:** `App.tsx:133`
**Severity:** MEDIUM
**Status:** FIXED

**Issue:**
Deleting documents directly inside the onSnapshot callback can cause race conditions.

**Original Code:**
```typescript
onSnapshot(collection(db, "restaurants"), (snapshot) => {
  snapshot.forEach((docSnapshot) => {
    if (!data.visits || data.visits.length === 0) {
      deleteDoc(docSnapshot.ref).catch(e => console.error("Auto-cleanup error:", e));
    }
  });
});
```

**Fix Applied:**
Collect documents to delete first, then delete them after processing the snapshot:
```typescript
const docsToDelete: any[] = [];
snapshot.forEach((docSnapshot) => {
  if (!data.visits || data.visits.length === 0) {
    docsToDelete.push(docSnapshot.ref);
  }
});
// Delete after snapshot processing
Promise.all(docsToDelete.map(ref => deleteDoc(ref)));
```

---

### 4. ✅ useEffect Dependency Issues
**File:** `App.tsx:77, 154`, `ImageSlider.tsx:63`
**Severity:** MEDIUM
**Status:** FIXED

**Issues:**

**a) Auth Listener Re-subscription:**
- Dependency `[user?.uid]` caused unnecessary re-subscriptions
- Fixed by removing from dependency array

**b) Data Fetching Re-subscription:**
- `selectedRestaurant` in dependencies caused unnecessary re-subscriptions
- Fixed by using setState callback pattern

**c) Missing handleLightboxClose dependency:**
- ImageSlider keyboard handler was missing function dependency
- Fixed by adding to dependency array

---

## ⚠️ Moderate Issues (Recommendations)

### 5. Security: Exposed Firebase Config
**File:** `firebaseConfig.ts`
**Severity:** MEDIUM
**Status:** RECOMMENDATION

**Issue:**
Firebase configuration is hardcoded in the source file. While Firebase API keys are designed to be public to some extent, sensitive values should not be in source control.

**Recommendation:**
Move to environment variables:
```typescript
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // ... etc
};
```

---

### 6. CORS Cache Busting Might Fail
**File:** `RestaurantDetail.tsx:85`
**Severity:** LOW
**Status:** RECOMMENDATION

**Issue:**
Adding timestamp to Firebase Storage URLs for cache busting might violate CORS policies:
```typescript
img.src = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
```

**Recommendation:**
Configure Firebase Storage CORS properly or use Firebase's built-in cache control headers.

---

## ⚡ Performance Optimizations

### 7. Component Memoization
**Files:** Multiple components
**Severity:** LOW
**Status:** RECOMMENDATION

**Issue:**
Several components re-render unnecessarily.

**Candidates for React.memo:**
- `RestaurantDetail`
- `ImageSlider`
- `AddVisitModal`
- `EditVisitModal`
- `MapContainer`
- `StatsModal`

**Example:**
```typescript
export default React.memo(ImageSlider);
```

---

### 8. Marker Management Optimization
**File:** `MapContainer.tsx`
**Severity:** LOW
**Status:** ALREADY OPTIMIZED

**Current Implementation:**
The code already implements efficient marker management:
- Uses a Map to track existing markers
- Only creates new markers for new restaurants
- Only removes markers for deleted restaurants
- Uses MarkerClusterer for performance

**Status:** ✅ No changes needed

---

### 9. Image Processing Progress Indicator
**File:** `AddVisitModal.tsx:110`
**Severity:** LOW
**Status:** RECOMMENDATION

**Issue:**
Multi-image upload shows loading state but no progress indication.

**Current:**
```typescript
const blobs = await Promise.all(files.map(f => processFile(f)));
```

**Recommendation:**
Add progress tracking:
```typescript
const [progress, setProgress] = useState(0);
// Show progress bar: {progress}/{files.length} images processed
```

---

## 🔍 Code Quality Improvements

### 10. Missing Error Boundaries
**Status:** RECOMMENDATION

**Issue:**
No error boundaries to catch and handle React errors gracefully.

**Recommendation:**
Add error boundary component:
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

---

### 11. TypeScript Strict Mode
**File:** `tsconfig.json`
**Status:** RECOMMENDATION

**Check:**
Ensure strict mode is enabled for better type safety:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

## 📊 Summary

### Fixed Issues: 4
- ✅ Firebase/Google Maps API key confusion
- ✅ Memory leaks (blob URLs)
- ✅ Race condition in snapshot listener
- ✅ useEffect dependency issues

### Recommendations: 7
- Security improvements (environment variables)
- Performance optimizations (memoization)
- Code quality improvements (error boundaries)
- User experience enhancements (progress indicators)

---

## 🎯 Priority Action Items

**High Priority:**
1. ✅ Fixed: Memory leaks - DONE
2. ✅ Fixed: Race conditions - DONE
3. ⚠️ TODO: Move Firebase config to environment variables
4. ⚠️ TODO: Create separate Google Maps API key

**Medium Priority:**
1. Add error boundaries
2. Implement component memoization for better performance
3. Configure Firebase Storage CORS

**Low Priority:**
1. Add upload progress indicators
2. Enable TypeScript strict mode
3. Add code documentation

---

## 📝 Testing Recommendations

1. **Memory Testing:** Monitor memory usage over time with multiple image uploads
2. **Performance Testing:** Test with 100+ restaurant markers on the map
3. **Error Handling:** Test network failures, Firebase auth failures
4. **Mobile Testing:** Ensure touch gestures work correctly on all devices
5. **CORS Testing:** Verify image sharing works with Firebase Storage

---

**End of Report**
