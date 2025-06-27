




if (window.firebase) {
    const auth = firebase.auth();
    const db = firebase.firestore();


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

    let currentUser = null; // Tracks the currently logged-in user
    let allNotifications = []; // Stores all site-wide notifications from the 'notifications' collection
    let readNotificationIds = new Set(); // Stores IDs of notifications read by the current user


    window.notificationListeners = {
        unsubscribeSiteWide: () => {},
        unsubscribeReadStatus: () => {},
        unsubscribeAll: function() {
            this.unsubscribeSiteWide();
            this.unsubscribeReadStatus();
            console.log("All notification listeners unsubscribed.");
        }
    };


    auth.onAuthStateChanged(user => {
        currentUser = user; // Update the currentUser variable

        window.notificationListeners.unsubscribeAll();

        startListeningNotifications();
    });

    function startListeningNotifications() {
        console.log("Starting notification listeners...");


        window.notificationListeners.unsubscribeSiteWide = db.collection('notifications')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                allNotifications = []; // Clear previous notifications
                snapshot.forEach(doc => {
                    allNotifications.push({ id: doc.id, ...doc.data() });
                });
                updateNotificationUI(); // Update UI whenever site-wide notifications change
                console.log("Site-wide notifications updated.");
            }, error => {
                console.error("Error listening to site-wide notifications:", error);

            });


        if (currentUser) {
            window.notificationListeners.unsubscribeReadStatus = db.collection('users').doc(currentUser.uid).collection('readNotifications')
                .onSnapshot(snapshot => {
                    readNotificationIds.clear(); // Clear previous read status
                    snapshot.forEach(doc => {
                        readNotificationIds.add(doc.id); // Add the notification ID to the set of read IDs
                    });
                    updateNotificationUI(); // Update UI whenever user's read status changes
                    console.log("User-specific read notifications updated.");
                }, error => {
                    console.error("Error listening to user's read notifications:", error);
                });
        } else {

            readNotificationIds.clear();
            updateNotificationUI();
            console.log("No user logged in, user-specific read notifications listener not active.");
        }
    }

    function isRead(notification) {
        return readNotificationIds.has(notification.id);
    }

    function updateNotificationUI() {

        const unreadCount = allNotifications.filter(n => !isRead(n)).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }

        if (allNotifications.length === 0) {
            notificationsContainer.innerHTML = '<p style="text-align: center; margin: 10px;">No notifications</p>';
            return;
        }

        notificationsContainer.innerHTML = allNotifications.map(n => {

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
        if (!item) return; // Not a notification item
        const id = item.getAttribute('data-id');
        markAsRead(id); // Call function to mark this notification as read
    });


    function markAsRead(notificationId) {
        if (!currentUser) {
            console.warn("Cannot mark as read: No user logged in.");


            return;
        }


        db.collection('users').doc(currentUser.uid).collection('readNotifications').doc(notificationId).set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Notification marked as read by user:", notificationId);


        }).catch(error => {
            console.error("Error marking notification as read:", error);

        });
    }

    notificationBtn.addEventListener('click', () => {

        notificationsContainer.style.display = notificationsContainer.style.display === 'block' ? 'none' : 'block';


        if (notificationsContainer.style.display === 'block' && currentUser) {
            allNotifications.forEach(n => {
                if (!isRead(n)) { // Only try to mark if it's currently showing as unread
                    markAsRead(n.id);
                }
            });
        }
    });

} else {

    console.error("Firebase global object not found. Ensure Firebase SDKs are loaded and initialized before notifications.js");
}