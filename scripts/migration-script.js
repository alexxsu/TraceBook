/**
 * COPY THIS ENTIRE SCRIPT INTO BROWSER CONSOLE
 * 
 * Steps:
 * 1. Open https://gastromap-c12c3.firebaseapp.com (your app)
 * 2. Login as admin
 * 3. Press F12 → Console tab
 * 4. Paste this entire script and press Enter
 */

(async function() {
  const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const firebaseConfig = {
    apiKey: "AIzaSyCHoA2Vegt3SaybflKyedD7Y33o6kUPZr0",
    authDomain: "gastromap-c12c3.firebaseapp.com",
    projectId: "gastromap-c12c3",
    storageBucket: "gastromap-c12c3.firebasestorage.app",
    messagingSenderId: "253135554462",
    appId: "1:253135554462:web:824a3172c96d5ae1de388f"
  };
  
  let db;
  if (getApps().length > 0) {
    const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    db = getFirestore(getApp());
  } else {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  
  console.log('🚀 Starting migration: restaurants → places\n');
  
  const mapsSnapshot = await getDocs(collection(db, 'maps'));
  console.log(`Found ${mapsSnapshot.size} maps\n`);
  
  let migrated = 0;
  
  for (const mapDoc of mapsSnapshot.docs) {
    const mapId = mapDoc.id;
    const mapName = mapDoc.data().name || mapId;
    const restaurantsSnapshot = await getDocs(collection(db, 'maps', mapId, 'restaurants'));
    
    if (restaurantsSnapshot.empty) {
      console.log(`📂 ${mapName}: (empty)`);
      continue;
    }
    
    console.log(`📂 ${mapName}: ${restaurantsSnapshot.size} items`);
    
    for (const restDoc of restaurantsSnapshot.docs) {
      const data = restDoc.data();
      await setDoc(doc(db, 'maps', mapId, 'places', restDoc.id), data);
      await deleteDoc(doc(db, 'maps', mapId, 'restaurants', restDoc.id));
      console.log(`   ✅ ${data.name}`);
      migrated++;
    }
  }
  
  console.log(`\n✨ Done! Migrated ${migrated} documents.`);
  console.log('Refresh the page to verify everything works!');
})();
