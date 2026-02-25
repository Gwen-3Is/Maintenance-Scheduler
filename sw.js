function checkSchedules() {
    const now = new Date();
    
    schedules.forEach(task => {
        if (task.notified) return;
        
        const taskTime = new Date(task.date + 'T' + task.time);
        const diff = taskTime - now;
        
        if (diff <= 300000 && diff > -3600000) {
            // Show notification
            self.registration.showNotification('🔧 Maintenance Due!', {
                body: `${task.computer} - ${task.type} at ${task.time}`,
                icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
                badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
                data: { taskId: task.id }
            });
            
            // 🔴 MISSING: Mark as notified to prevent repeats!
            task.notified = true;  // <-- ADD THIS LINE
            
            // Notify main thread to update localStorage
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'TASK_DUE',
                        taskId: task.id
                    });
                });
            });
        }
    });
}
