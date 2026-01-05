/**
 * Global Accessibility Manager
 * Ensures accessibility settings work across entire project
 */

class GlobalAccessibilityManager {
    constructor() {
        this.settings = {
            highContrast: false,
            largeText: false,
            screenReader: false,
            vibrationAlerts: true
        };
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.applySettings();
        this.setupEventListeners();
        
        // Apply immediately on page load
        document.addEventListener('DOMContentLoaded', () => {
            this.applySettings();
        });
        
        // Apply when React components mount
        setTimeout(() => {
            this.applySettings();
        }, 100);
    }
    
    loadSettings() {
        this.settings.highContrast = localStorage.getItem('highContrast') === 'true';
        this.settings.largeText = localStorage.getItem('largeText') === 'true';
        this.settings.screenReader = localStorage.getItem('screenReader') === 'true';
        this.settings.vibrationAlerts = localStorage.getItem('vibration') !== 'false';
    }
    
    applySettings() {
        const body = document.body;
        const html = document.documentElement;
        
        // High Contrast
        if (this.settings.highContrast) {
            body.classList.add('high-contrast');
            html.classList.add('high-contrast');
            this.injectHighContrastCSS();
        } else {
            body.classList.remove('high-contrast');
            html.classList.remove('high-contrast');
            this.removeCSS('hc-global');
        }
        
        // Large Text
        if (this.settings.largeText) {
            body.classList.add('large-text');
            html.classList.add('large-text');
            this.injectLargeTextCSS();
        } else {
            body.classList.remove('large-text');
            html.classList.remove('large-text');
            this.removeCSS('lt-global');
        }
        
        // Screen Reader
        if (this.settings.screenReader) {
            body.classList.add('screen-reader-enabled');
            html.classList.add('screen-reader-enabled');
        } else {
            body.classList.remove('screen-reader-enabled');
            html.classList.remove('screen-reader-enabled');
        }
        
        // Vibration
        if (this.settings.vibrationAlerts) {
            body.classList.add('vibration-enabled');
            html.classList.add('vibration-enabled');
        } else {
            body.classList.remove('vibration-enabled');
            html.classList.remove('vibration-enabled');
        }
        
        // Store in window for global access
        window.accessibilitySettings = this.settings;
    }
    
    injectHighContrastCSS() {
        let style = document.getElementById('hc-global');
        if (!style) {
            style = document.createElement('style');
            style.id = 'hc-global';
            document.head.appendChild(style);
        }
        style.textContent = `
            html.high-contrast, html.high-contrast body, html.high-contrast *,
            body.high-contrast, body.high-contrast * {
                background: #000000 !important;
                background-color: #000000 !important;
                background-image: none !important;
                color: #ffffff !important;
                border-color: #ffffff !important;
                text-shadow: none !important;
                box-shadow: none !important;
            }
            html.high-contrast button, body.high-contrast button {
                background: #ffffff !important;
                color: #000000 !important;
                border: 3px solid #000000 !important;
                font-weight: bold !important;
            }
            html.high-contrast button:hover, body.high-contrast button:hover {
                background: #ffff00 !important;
                color: #000000 !important;
            }
            html.high-contrast input, html.high-contrast textarea, html.high-contrast select,
            body.high-contrast input, body.high-contrast textarea, body.high-contrast select {
                background: #ffffff !important;
                color: #000000 !important;
                border: 2px solid #000000 !important;
            }
        `;
    }
    
    injectLargeTextCSS() {
        let style = document.getElementById('lt-global');
        if (!style) {
            style = document.createElement('style');
            style.id = 'lt-global';
            document.head.appendChild(style);
        }
        style.textContent = `
            html.large-text, html.large-text body, body.large-text { 
                font-size: 1.25em !important; 
            }
            html.large-text *, body.large-text * { 
                font-size: inherit !important; 
            }
            html.large-text button, body.large-text button { 
                padding: 1rem 1.5rem !important; 
                font-size: 1.25rem !important; 
            }
            html.large-text h1, body.large-text h1 { font-size: 2.5rem !important; }
            html.large-text h2, body.large-text h2 { font-size: 2rem !important; }
            html.large-text h3, body.large-text h3 { font-size: 1.75rem !important; }
            html.large-text p, body.large-text p { font-size: 1.25rem !important; }
        `;
    }
    
    removeCSS(id) {
        const style = document.getElementById(id);
        if (style) style.remove();
    }
    
    setupEventListeners() {
        // Listen for changes from any part of the project
        window.addEventListener('accessibilityChange', (event) => {
            this.settings = event.detail;
            this.saveSettings();
            this.applySettings();
        });
        
        // Listen for storage changes (cross-tab sync)
        window.addEventListener('storage', (event) => {
            if (['highContrast', 'largeText', 'screenReader', 'vibration'].includes(event.key)) {
                this.loadSettings();
                this.applySettings();
            }
        });
    }
    
    saveSettings() {
        localStorage.setItem('highContrast', this.settings.highContrast);
        localStorage.setItem('largeText', this.settings.largeText);
        localStorage.setItem('screenReader', this.settings.screenReader);
        localStorage.setItem('vibration', this.settings.vibrationAlerts);
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.applySettings();
        
        // Broadcast change
        window.dispatchEvent(new CustomEvent('accessibilityChange', {
            detail: this.settings
        }));
    }
}

// Initialize global accessibility manager
const globalAccessibility = new GlobalAccessibilityManager();

// Export for global use
window.globalAccessibility = globalAccessibility;