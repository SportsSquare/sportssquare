// notifications.js - Manages site-wide notifications and user-specific read status.

// This script assumes Firebase SDKs are loaded and firebase.initializeApp() has
// been called in your main HTML file (e.g., so-long-pops.html or signup.html)
// before notifications.js is loaded.

if (window.firebase) {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Dynamically create notification UI elements if they don't exist
    // This makes the script more portable.
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

    // Object to hold unsubscribe functions for Firestore listeners
    // This allows us to stop listening when the user logs out or logs in with a different account.
    window.notificationListeners = {
        unsubscribeSiteWide: () => {},
        unsubscribeReadStatus: () => {},
        unsubscribeAll: function() {
            this.unsubscribeSiteWide();
            this.unsubscribeReadStatus();
            console.log("All notification listeners unsubscribed.");
        }
    };

    // Listen for Firebase Authentication state changes
    // This is the primary trigger for starting/stopping notification listeners.
    auth.onAuthStateChanged(user => {
        currentUser = user; // Update the currentUser variable
        // Unsubscribe from any existing listeners to prevent memory leaks and redundant calls
        window.notificationListeners.unsubscribeAll();
        // Start new listeners based on the updated user state
        startListeningNotifications();
    });

    // Function to start listening to Firestore for notifications and user-specific read status
    function startListeningNotifications() {
        console.log("Starting notification listeners...");

        // 1. Listener for the main site-wide 'notifications' collection
        // Everyone can read these, as per your security rules.
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
                // In a real app, you might show a user-friendly error message here.
            });

        // 2. Listener for the current user's 'readNotifications' subcollection
        // This listener is only active if a user is authenticated.
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
            // If no user is logged in, clear any existing read status and update UI.
            readNotificationIds.clear();
            updateNotificationUI();
            console.log("No user logged in, user-specific read notifications listener not active.");
        }
    }

    // Helper function to determine if a notification has been read by the current user
    function isRead(notification) {
        return readNotificationIds.has(notification.id);
    }

    // Updates the notification badge and the list of notifications in the UI
    function updateNotificationUI() {
        // Calculate unread count based on current allNotifications and readNotificationIds
        const unreadCount = allNotifications.filter(n => !isRead(n)).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }

        // Display "No notifications" if there are none
        if (allNotifications.length === 0) {
            notificationsContainer.innerHTML = '<p style="text-align: center; margin: 10px;">No notifications</p>';
            return;
        }

        // Populate the notifications container
        notificationsContainer.innerHTML = allNotifications.map(n => {
            // Format timestamp for display
            const time = n.timestamp && typeof n.timestamp.toDate === 'function'
                ? n.timestamp.toDate().toLocaleString()
                : (typeof n.timestamp === 'number' ? new Date(n.timestamp).toLocaleString() : 'N/A');

            // Apply 'unread' styling if the notification hasn't been read by the user
            return `
                <div class="notification-item ${!isRead(n) ? 'unread' : ''}" data-id="${n.id}" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer; ${!isRead(n) ? 'font-weight:bold; background-color:#f0f8ff;' : ''}">
                    ${n.message}<br>
                    <small>${time}</small>
                </div>
            `;
        }).join('');
    }

    // Event listener for clicking on a specific notification item
    notificationsContainer.addEventListener('click', e => {
        const item = e.target.closest('.notification-item');
        if (!item) return; // Not a notification item
        const id = item.getAttribute('data-id');
        markAsRead(id); // Call function to mark this notification as read
    });

    // Function to mark a specific notification as read by the current user
    // This writes to the user's personal 'readNotifications' subcollection.
    function markAsRead(notificationId) {
        if (!currentUser) {
            console.warn("Cannot mark as read: No user logged in.");
            // You might want to show a message box to the user here
            // showMessageBox("Please log in to mark notifications as read.");
            return;
        }

        // Create a document in the user's /readNotifications subcollection
        // The document ID will be the notificationId, and it just needs a timestamp.
        db.collection('users').doc(currentUser.uid).collection('readNotifications').doc(notificationId).set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Notification marked as read by user:", notificationId);
            // The onSnapshot listener for 'readNotificationIds' will automatically pick up this change
            // and trigger updateNotificationUI, so no manual UI update is needed here.
        }).catch(error => {
            console.error("Error marking notification as read:", error);
            // showMessageBox("Failed to mark notification as read. Please check your user permissions.");
        });
    }

    // Event listener for the main notification button (bell icon)
    notificationBtn.addEventListener('click', () => {
        // Toggle visibility of the notifications container
        notificationsContainer.style.display = notificationsContainer.style.display === 'block' ? 'none' : 'block';

        // When the container is opened, attempt to mark all currently displayed notifications as read
        // This will only work for authenticated users, as per the markAsRead function logic.
        if (notificationsContainer.style.display === 'block' && currentUser) {
            allNotifications.forEach(n => {
                if (!isRead(n)) { // Only try to mark if it's currently showing as unread
                    markAsRead(n.id);
                }
            });
        }
    });

} else {
    // Log an error if Firebase is not initialized, indicating a loading order issue.
    console.error("Firebase global object not found. Ensure Firebase SDKs are loaded and initialized before notifications.js");
}