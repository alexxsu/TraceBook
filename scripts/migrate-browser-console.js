/**
 * BROWSER CONSOLE MIGRATION SCRIPT
 * 
 * Run this in your browser console while logged into your app.
 * 
 * Steps:
 * 1. Open your TraceBook app in the browser
 * 2. Login as admin
 * 3. Open Developer Tools (F12)
 * 4. Go to Console tab
 * 5. Paste this entire script and press Enter
 * 6. Wait for completion message
 */

(async function migrateRestaurantsToPlaces() {
  // Import Firebase functions from the window (they should be available if the app is loaded)
  const { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  // Get the Firestore instance from window (set by your app)
  // If this doesn't work, you may need to access it differently
  const db = window.db || window.firestore;
  
  if (!db) {
    console.error('❌ Could not find Firestore instance. Make sure you are on the app page.');
    return;
  }
  
  console.log('🚀 Starting migration: restaurants → places\n');
  
  // Step 1: Get all maps
  const mapsRef = collection(db, 'maps');
  const mapsSnapshot = await getDocs(mapsRef);
  
  console.log(`📍 Found ${mapsSnapshot.size} maps to process\n`);
  
  let totalMigrated = 0;
  let totalDeleted = 0;
  
  for (const mapDoc of mapsSnapshot.docs) {
    const mapId = mapDoc.id;
    const mapData = mapDoc.data();
    console.log(`\n📂 Processing map: ${mapData.name || mapId}`);
    
    // Step 2: Get all documents from restaurants subcollection
    const restaurantsRef = collection(db, 'maps', mapId, 'restaurants');
    const restaurantsSnapshot = await getDocs(restaurantsRef);
    
    if (restaurantsSnapshot.empty) {
      console.log(`   ⏭️  No restaurants found, skipping`);
      continue;
    }
    
    console.log(`   📄 Found ${restaurantsSnapshot.size} documents to migrate`);
    
    // Step 3: Copy each document to places subcollection
    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const docId = restaurantDoc.id;
      const docData = restaurantDoc.data();
      
      // Create in new 'places' collection
      const newPlaceRef = doc(db, 'maps', mapId, 'places', docId);
      await setDoc(newPlaceRef, docData);
      totalMigrated++;
      
      console.log(`   ✅ Copied: ${docData.name || docId}`);
      
      // Delete old document
      const oldRef = doc(db, 'maps', mapId, 'restaurants', docId);
      await deleteDoc(oldRef);
      totalDeleted++;
    }
    
    console.log(`   ✨ Migrated ${restaurantsSnapshot.size} documents`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Migration complete!');
  console.log(`   📊 Total documents migrated: ${totalMigrated}`);
  console.log(`   🗑️  Total documents deleted: ${totalDeleted}`);
  console.log('='.repeat(50));
  console.log('\n👋 Done! Now update your code to use "places" collection.');
})();
