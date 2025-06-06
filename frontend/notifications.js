// notifications.js - Corrected to work with Firebase already initialized in signup.html

// No need to define firebaseConfig or load SDKs here, as signup.html already does it.
// We assume firebase.initializeApp() has already been called in signup.html's script.

// Wait for Firebase to be ready (it should be, since signup.html loads it first)
// A simple check like this ensures global 'firebase' object is available.
if (window.firebase) {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Create notification UI elements if not already present
    // This part is safe to keep as it only creates DOM elements.
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
        // Ensure 'notifications' collection exists in Firestore and has proper security rules.
        db.collection('notifications')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                notifications = [];
                snapshot.forEach(doc => {
                    notifications.push({ id: doc.id, ...doc.data() });
                });
                updateNotificationUI();
            }, error => {
                console.error("Error listening to notifications:", error);
                // Optionally show a user-friendly message
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
            notificationsContainer.innerHTML = '<p style="text-align: center; margin: 10px;">No notifications</p>';
            return;
        }

        notificationsContainer.innerHTML = notifications.map(n => {
            // Check if timestamp is a Firebase Timestamp object or a number
            const time = n.timestamp && typeof n.timestamp.toDate === 'function'
                ? n.timestamp.toDate().toLocaleString()
                : (typeof n.timestamp === 'number' ? new Date(n.timestamp).toLocaleString() : 'N/A');


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
        if (!currentUser) {
            console.warn("Cannot mark as read: No user logged in.");
            return;
        }
        const notifRef = db.collection('notifications').doc(notificationId);
        notifRef.update({
            readBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        }).then(() => {
            console.log("Notification marked as read:", notificationId);
        }).catch(error => {
            console.error("Error marking notification as read:", error);
        });
    }

    notificationBtn.addEventListener('click', () => {
        notificationsContainer.style.display = notificationsContainer.style.display === 'block' ? 'none' : 'block';
        // When opening, mark all currently visible notifications as read if they aren't
        if (notificationsContainer.style.display === 'block' && currentUser) {
            notifications.forEach(n => {
                if (!isRead(n)) {
                    markAsRead(n.id);
                }
            });
        }
    });

} else {
    console.error("Firebase global object not found. Ensure Firebase SDKs are loaded before notifications.js");
}