class AccessibilityControls {
    constructor() {
        this.settings = {
            highContrast: false,
            largeText: false,
            screenReader: false,
            vibrationAlerts: false
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.applySettings();
    }

    bindEvents() {
        document.getElementById('contrast-toggle').addEventListener('click', () => this.toggle('highContrast'));
        document.getElementById('text-toggle').addEventListener('click', () => this.toggle('largeText'));
        document.getElementById('reader-toggle').addEventListener('click', () => this.toggle('screenReader'));
        document.getElementById('vibration-toggle').addEventListener('click', () => this.toggle('vibrationAlerts'));
    }

    toggle(setting) {
        this.settings[setting] = !this.settings[setting];
        this.applySettings();
        this.saveSettings();
        this.announce(`${setting.replace(/([A-Z])/g, ' $1').toLowerCase()} ${this.settings[setting] ? 'enabled' : 'disabled'}`);
        
        if (this.settings.vibrationAlerts && 'vibrate' in navigator) {
            navigator.vibrate(100);
        }
    }

    applySettings() {
        const body = document.body;
        
        // High Contrast
        body.classList.toggle('high-contrast', this.settings.highContrast);
        this.updateToggle('contrast', this.settings.highContrast);
        
        // Large Text
        body.classList.toggle('large-text', this.settings.largeText);
        this.updateToggle('text', this.settings.largeText);
        
        // Screen Reader
        this.updateToggle('reader', this.settings.screenReader);
        
        // Vibration Alerts
        this.updateToggle('vibration', this.settings.vibrationAlerts);
    }

    updateToggle(type, isActive) {
        const toggle = document.getElementById(`${type}-toggle`);
        const status = document.getElementById(`${type}-status`);
        
        toggle.classList.toggle('active', isActive);
        status.textContent = isActive ? 'ON' : 'OFF';
        toggle.setAttribute('aria-pressed', isActive);
    }

    announce(message) {
        if (this.settings.screenReader) {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.textContent = message;
            
            document.body.appendChild(announcement);
            setTimeout(() => document.body.removeChild(announcement), 1000);
        }
    }

    saveSettings() {
        localStorage.setItem('accessibilitySettings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('accessibilitySettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AccessibilityControls();
});