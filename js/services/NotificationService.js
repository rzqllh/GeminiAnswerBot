/**
 * @file js/services/NotificationService.js
 * @description Handles in-app toast notifications and global error reporting.
 */

export class NotificationService {
    constructor() {
        this.container = this._createContainer();
    }

    _createContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show a toast notification.
     * @param {string} message - Message to display.
     * @param {'info'|'success'|'error'} type - Type of notification.
     * @param {number} duration - Duration in ms.
     */
    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Inline styles for simplicity, can be moved to CSS
        const colors = {
            info: '#3b82f6',
            success: '#22c55e',
            error: '#ef4444'
        };

        toast.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
        `;

        this.container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    error(message) {
        this.show(message, 'error', 5000);
        console.error(message);
    }

    success(message) {
        this.show(message, 'success');
    }
}

export const notificationService = new NotificationService();
