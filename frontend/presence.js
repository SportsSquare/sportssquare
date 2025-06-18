// presence.js

function setupPresence(uid) {
  const userStatusDatabaseRef = db.ref('/status/' + uid);

  const isOfflineForDatabase = {
    state: 'offline',
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };

  const isOnlineForDatabase = {
    state: 'online',
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };

  const connectedRef = db.ref('.info/connected');
  connectedRef.on('value', (snap) => {
    if (snap.val() === false) return;

    userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
      userStatusDatabaseRef.set(isOnlineForDatabase);
    });
  });
}

auth.onAuthStateChanged(user => {
  if (user) {
    console.log("Setting up presence for:", user.uid);
    setupPresence(user.uid);
  }
});
