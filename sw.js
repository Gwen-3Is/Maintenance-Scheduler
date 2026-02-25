// Service Worker for Background Notifications
// This runs even when the website is closed!

const CACHE_NAME = 'maintenance-scheduler-v1';

// Install event - cache assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    self.skipWaiting();
});

// Activate event - take control immediately
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(self.clients.claim());
});

// Store schedules in memory (Service Worker scope)
let swSchedules = [];

// Listen for messages from main page
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SYNC_SCHEDULES') {
        swSchedules = event.data.schedules;
        console.log('Schedules synced to Service Worker:', swSchedules.length);
    }
});

// Background notification checker - runs every 30 seconds
setInterval(() => {
    checkSchedules();
}, 30000);

function checkSchedules() {
    const now = new Date();
    
    swSchedules.forEach(task => {
        const taskTime = new Date(task.date + 'T' + task.time);
        
        // Check if task is due (within last minute) and not notified
        if (now >= taskTime && !task.notified && (now - taskTime < 60000)) {
            showNotification(task);
        }
    });
}

function showNotification(task) {
    const title = '🔧 Maintenance Due!';
    const options = {
        body: `${task.computer} requires ${task.type} maintenance now.\nTechnician: ${task.technician}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        tag: task.id,
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ],
        data: {
            taskId: task.id,
            url: self.location.origin
        }
    };
    
    self.registration.showNotification(title, options)
        .then(() => {
            console.log('Notification shown for:', task.computer);
            notifyClients(task.id);
        })
        .catch(err => console.error('Notification failed:', err));
}

function notifyClients(taskId) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'TASK_DUE',
                taskId: taskId
            });
        });
    });
}

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const taskId = event.notification.data.taskId;
    const url = event.notification.data.url;
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            self.clients.matchAll({type: 'window'}).then(clients => {
                for (let client of clients) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow(url);
                }
            })
        );
    }
});
