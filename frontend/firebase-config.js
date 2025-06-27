

const firebaseConfig = {
  apiKey: "AIzaSyC-p_D5KgLbpMm_5REwdDaaq-YBrE3pwkk",
  authDomain: "sportssquare-b96ed.firebaseapp.com",
  databaseURL: "https://sportssquare-b96ed-default-rtdb.firebaseio.com",
  projectId: "sportssquare-b96ed",
  storageBucket: "sportssquare-b96ed.firebasestorage.app",
  messagingSenderId: "844736978057",
  appId: "1:844736978057:web:76c8db520d3c27bdeb7a58"
};



window.app = firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.firestore(); // This is for Firestore
window.rtdb = firebase.database(); // This is for Realtime Database