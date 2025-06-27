// presence.js

function setupPresence(uid) {
  // Use window.rtdb for Realtime Database operations
  const userStatusDatabaseRef = window.rtdb.ref('/status/' + uid);

  const isOfflineForDatabase = {
    state: 'offline',
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };

  const isOnlineForDatabase = {
    state: 'online',
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };

  // Use window.rtdb for Realtime Database operations
  const connectedRef = window.rtdb.ref('.info/connected');
  connectedRef.on('value', (snap) => {
    if (snap.val() === false) return;

    userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
      userStatusDatabaseRef.set(isOnlineForDatabase);
    });
  });
}

// Ensure 'auth' is globally accessible (via window.auth from firebase-config.js)
window.auth.onAuthStateChanged(user => {
  if (user) {
    console.log("Setting up presence for:", user.uid);
    setupPresence(user.uid);
  }
});
