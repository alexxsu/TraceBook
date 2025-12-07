/**
 * SIMPLE BROWSER CONSOLE MIGRATION
 * 
 * Steps:
 * 1. Open your TraceBook app in Chrome and LOGIN AS ADMIN
 * 2. Press F12 to open Developer Tools
 * 3. Go to Console tab
 * 4. Copy and paste this ENTIRE script
 * 5. Press Enter and wait for "Migration complete!"
 */

// Step 1: Get Firebase config from your app's script
const scripts = document.querySelectorAll('script');
console.log('🔍 Looking for Firebase...');

// Try to access the existing Firebase instance
let dbInstance = null;

// Method 1: Check if it's on window
if (typeof db !== 'undefined') {
  dbInstance = db;
  console.log('✅ Found db on window');
}

// If not found, we need to import it
if (!dbInstance) {
  console.log('⚠️ db not found on window. Trying alternative method...');
  console.log('');
  console.log('Please run this modified version instead:');
  console.log('');
}

// Self-executing migration function
(async function() {
  // Import Firebase from CDN
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  // Your Firebase config - REPLACE THESE VALUES with your actual config from firebaseConfig.ts
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT.firebaseapp.com", 
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };
  
  // Check if config is filled in
  if (firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
    console.error('❌ ERROR: You need to fill in your Firebase config!');
    console.log('');
    console.log('1. Open your firebaseConfig.ts file');
    console.log('2. Copy the values into the firebaseConfig object above');
    console.log('3. Run this script again');
    return;
  }
  
  // Initialize Firebase
  let app, db;
  try {
    app = initializeApp(firebaseConfig, 'migration-app');
    db = getFirestore(app);
    console.log('✅ Firebase initialized');
  } catch (e) {
    // App might already exist
    const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    try {
      app = getApp();
      db = getFirestore(app);
      console.log('✅ Using existing Firebase app');
    } catch (e2) {
      console.error('❌ Could not initialize Firebase:', e2);
      return;
    }
  }
  
  console.log('');
  console.log('🚀 Starting migration: restaurants → places');
  console.log('================================================');
  
  // Get all maps
  const mapsSnapshot = await getDocs(collection(db, 'maps'));
  console.log(`📍 Found ${mapsSnapshot.size} maps`);
  
  let totalMigrated = 0;
  let totalErrors = 0;
  
  for (const mapDoc of mapsSnapshot.docs) {
    const mapId = mapDoc.id;
    const mapName = mapDoc.data().name || mapId;
    
    console.log(`\n📂 ${mapName}`);
    
    // Get restaurants
    const restaurantsSnapshot = await getDocs(collection(db, 'maps', mapId, 'restaurants'));
    
    if (restaurantsSnapshot.empty) {
      console.log('   (no data to migrate)');
      continue;
    }
    
    for (const restDoc of restaurantsSnapshot.docs) {
      const docId = restDoc.id;
      const data = restDoc.data();
      
      try {
        // Copy to places
        await setDoc(doc(db, 'maps', mapId, 'places', docId), data);
        
        // Delete from restaurants  
        await deleteDoc(doc(db, 'maps', mapId, 'restaurants', docId));
        
        console.log(`   ✅ ${data.name || docId}`);
        totalMigrated++;
      } catch (err) {
        console.log(`   ❌ ${data.name || docId}: ${err.message}`);
        totalErrors++;
      }
    }
  }
  
  console.log('');
  console.log('================================================');
  console.log(`✨ Migration complete!`);
  console.log(`   ✅ Migrated: ${totalMigrated}`);
  if (totalErrors > 0) {
    console.log(`   ❌ Errors: ${totalErrors}`);
  }
  console.log('================================================');
  console.log('');
  console.log('Next steps:');
  console.log('1. Refresh your app to verify data still loads');
  console.log('2. Deploy your updated code');
})();
