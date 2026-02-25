// Service Worker - Works on Desktop & Android
// iOS support limited (requires PWA install)

const CACHE_NAME = 'maint-scheduler-v1';

self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(self.clients.claim());
});

// Store schedules
let swSchedules = [];

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SYNC_SCHEDULES') {
        swSchedules = event.data.schedules;
        console.log('Schedules synced:', swSchedules.length);
    }
});

// Check every 30 seconds
setInterval(checkSchedules, 30000);

function checkSchedules() {
    const now = new Date();
    
    swSchedules.forEach(task => {
        const taskTime = new Date(task.date + 'T' + task.time);
        
        // Notify if due (within last 2 minutes) and not notified
        if (now >= taskTime && !task.notified && (now - taskTime < 120000)) {
            showNotification(task);
        }
    });
}

function showNotification(task) {
    const options = {
        body: `${task.computer} needs ${task.type}\nTechnician: ${task.technician}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        tag: task.id,
        requireInteraction: true,
        actions: [
            {action: 'open', title: 'Open App'},
            {action: 'dismiss', title: 'Dismiss'}
        ],
        data: {taskId: task.id, url: self.location.origin}
    };
    
    self.registration.showNotification('🔧 Maintenance Due!', options)
        .then(() => {
            console.log('Notification sent for:', task.computer);
            task.notified = true;
            notifyClients(task.id);
        })
        .catch(err => console.error('Notification failed:', err));
}

function notifyClients(taskId) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({type: 'TASK_DUE', taskId: taskId});
        });
    });
}

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data.url;
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            self.clients.matchAll({type: 'window'}).then(clients => {
                for (let client of clients) {
                    if (client.url.includes(url) && 'focus' in client) {
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
