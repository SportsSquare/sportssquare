// notifications.js

// Your Firebase config — replace with your actual config!
const firebaseConfig = {
    apiKey: "AIzaSyC-p_D5KgLbpMm_5REwdDaaq-YBrE3pwkk",
    authDomain: "sportssquare-b96ed.firebaseapp.com",
    projectId: "sportssquare-b96ed",
    storageBucket: "sportssquare-b96ed.appspot.com",
    messagingSenderId: "844736978057",
    appId: "1:844736978057:web:76c8db520d3c27bdeb7a58"
  };
  
  // Load Firebase SDKs dynamically (optional but recommended if not already loaded)
  function loadFirebaseSDKs(callback) {
    if (window.firebase) {
      callback();
      return;
    }
    const scripts = [
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js",
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js",
    ];
    let loaded = 0;
    scripts.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => {
        loaded++;
        if (loaded === scripts.length) callback();
      };
      document.head.appendChild(s);
    });
  }
  
  loadFirebaseSDKs(() => {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
  
    // Create notification UI elements if not already present
    if (!document.getElementById('notification-btn')) {
      const btn = document.createElement('div');
      btn.id = 'notification-btn';
      btn.title = 'Notifications';
      btn.style.position = 'fixed';
      btn.style.top = '10px';
      btn.style.right = '10px';
      btn.style.fontSize = '28px';
      btn.style.cursor = 'pointer';
      btn.style.userSelect = 'none';
      btn.style.zIndex = '9999';
      btn.innerHTML = '🔔<span id="notification-badge" style="position:absolute; top:0; right:0; background:red; color:white; border-radius:50%; padding:2px 7px; font-size:14px; display:none;"></span>';
      document.body.appendChild(btn);
  
      const container = document.createElement('div');
      container.id = 'notifications';
      container.style.maxWidth = '320px';
      container.style.maxHeight = '300px';
      container.style.overflowY = 'auto';
      container.style.border = '1px solid #ccc';
      container.style.padding = '10px';
      container.style.marginTop = '10px';
      container.style.background = '#fff';
      container.style.display = 'none';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.position = 'fixed';
      container.style.top = '50px';
      container.style.right = '10px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
  
    const notificationBtn = document.getElementById('notification-btn');
    const badge = document.getElementById('notification-badge');
    const notificationsContainer = document.getElementById('notifications');
  
    let currentUser = null;
    let notifications = [];
  
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUser = user;
        startListeningNotifications();
      } else {
        currentUser = null;
        badge.style.display = 'none';
        notificationsContainer.style.display = 'none';
        notificationsContainer.innerHTML = '';
      }
    });
  
    function startListeningNotifications() {
      db.collection('notifications')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
          notifications = [];
          snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
          });
          updateNotificationUI();
        });
    }
  
    function isRead(notification) {
      if (!currentUser || !notification.readBy) return false;
      return notification.readBy.includes(currentUser.uid);
    }
  
    function updateNotificationUI() {
      const unreadCount = notifications.filter(n => !isRead(n)).length;
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
  
      if (notifications.length === 0) {
        notificationsContainer.innerHTML = '<p>No notifications</p>';
        return;
      }
  
      notificationsContainer.innerHTML = notifications.map(n => {
        const time = typeof n.timestamp === "number"
          ? new Date(n.timestamp).toLocaleString()
          : n.timestamp.toDate().toLocaleString();
  
        return `
          <div class="notification-item ${!isRead(n) ? 'unread' : ''}" data-id="${n.id}" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer; ${!isRead(n) ? 'font-weight:bold; background-color:#f0f8ff;' : ''}">
            ${n.message}<br>
            <small>${time}</small>
          </div>
        `;
      }).join('');
    }
  
    notificationsContainer.addEventListener('click', e => {
      const item = e.target.closest('.notification-item');
      if (!item) return;
      const id = item.getAttribute('data-id');
      markAsRead(id);
    });
  
    function markAsRead(notificationId) {
      if (!currentUser) return;
      const notifRef = db.collection('notifications').doc(notificationId);
      notifRef.update({
        readBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
      }).catch(console.error);
    }
  
    notificationBtn.addEventListener('click', () => {
      notificationsContainer.style.display = notificationsContainer.style.display === 'block' ? 'none' : 'block';
    });
  });
  