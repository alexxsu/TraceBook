/**
 * Migration Script: Rename 'restaurants' subcollection to 'places'
 * 
 * This script will:
 * 1. Read all documents from maps/{mapId}/restaurants
 * 2. Copy them to maps/{mapId}/places
 * 3. Delete the original documents from restaurants
 * 
 * Run this script ONCE to migrate your data.
 * 
 * Usage:
 *   1. Install dependencies: npm install
 *   2. Run: npx ts-node scripts/migrate-restaurants-to-places.ts
 *   
 * Or run directly in browser console (see bottom of file)
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  writeBatch 
} from 'firebase/firestore';

// Your Firebase config - copy from firebaseConfig.ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateRestaurantsToPlaces() {
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
    const batch = writeBatch(db);
    const docsToDelete: string[] = [];
    
    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const docId = restaurantDoc.id;
      const docData = restaurantDoc.data();
      
      // Create in new 'places' collection
      const newPlaceRef = doc(db, 'maps', mapId, 'places', docId);
      batch.set(newPlaceRef, docData);
      
      // Mark old document for deletion
      docsToDelete.push(docId);
      
      console.log(`   ✅ Queued: ${docData.name || docId}`);
    }
    
    // Commit the batch (creates all new documents)
    await batch.commit();
    totalMigrated += docsToDelete.length;
    console.log(`   📝 Created ${docsToDelete.length} documents in 'places'`);
    
    // Step 4: Delete old documents from restaurants
    for (const docId of docsToDelete) {
      const oldRef = doc(db, 'maps', mapId, 'restaurants', docId);
      await deleteDoc(oldRef);
      totalDeleted++;
    }
    console.log(`   🗑️  Deleted ${docsToDelete.length} documents from 'restaurants'`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Migration complete!');
  console.log(`   📊 Total documents migrated: ${totalMigrated}`);
  console.log(`   🗑️  Total documents deleted: ${totalDeleted}`);
  console.log('='.repeat(50));
}

// Run the migration
migrateRestaurantsToPlaces()
  .then(() => {
    console.log('\n👋 Done! You can now update your code to use "places" collection.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
