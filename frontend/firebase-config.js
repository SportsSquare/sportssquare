// firebase-config.js
// Put this on every page before presence.js

// Include Firebase SDKs first in your HTML before these scripts (only once per page)
const firebaseConfig = {
    apiKey: "AIzaSyC-p_D5KgLbpMm_5REwdDaaq-YBrE3pwkk",
    authDomain: "sportssquare-b96ed.firebaseapp.com",
    databaseURL: "https://sportssquare-b96ed-default-rtdb.firebaseio.com",
    projectId: "sportssquare-b96ed",
    storageBucket: "sportssquare-b96ed.firebasestorage.app",
    messagingSenderId: "844736978057",
    appId: "1:844736978057:web:76c8db520d3c27bdeb7a58"
  };
  
  firebase.initializeApp(firebaseConfig);
  
  const auth = firebase.auth();
  const db = firebase.database();
  