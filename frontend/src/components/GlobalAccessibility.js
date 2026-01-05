import React, { useEffect } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';

const GlobalAccessibility = () => {
  const { settings, toggleSetting, announceToScreenReader } = useAccessibility();
  
  // Apply settings immediately when component mounts
  useEffect(() => {
    applyAccessibilitySettings(settings);
  }, [settings]);
  
  const applyAccessibilitySettings = (newSettings) => {
    const body = document.body;
    
    // High Contrast
    if (newSettings.highContrast) {
      body.classList.add('high-contrast');
      const style = document.createElement('style');
      style.id = 'high-contrast-override';
      style.textContent = `
        body.high-contrast, body.high-contrast *, body.high-contrast *::before, body.high-contrast *::after {
          background: #000000 !important;
          background-color: #000000 !important;
          background-image: none !important;
          color: #ffffff !important;
          border-color: #ffffff !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }
        body.high-contrast button, body.high-contrast .accessibility-button {
          background: #ffffff !important;
          color: #000000 !important;
          border: 3px solid #000000 !important;
          font-weight: bold !important;
        }
        body.high-contrast button:hover, body.high-contrast button.active {
          background: #ffff00 !important;
          color: #000000 !important;
        }
        body.high-contrast .glass, body.high-contrast [class*="bg-"] {
          background: #000000 !important;
          border: 2px solid #ffffff !important;
        }
      `;
      if (!document.getElementById('high-contrast-override')) {
        document.head.appendChild(style);
      }
    } else {
      body.classList.remove('high-contrast');
      const existingStyle = document.getElementById('high-contrast-override');
      if (existingStyle) existingStyle.remove();
    }
    
    // Large Text
    if (newSettings.largeText) {
      body.classList.add('large-text');
      const style = document.createElement('style');
      style.id = 'large-text-override';
      style.textContent = `
        body.large-text { font-size: 1.25em !important; }
        body.large-text * { font-size: inherit !important; }
        body.large-text .text-xs { font-size: 1rem !important; }
        body.large-text .text-sm { font-size: 1.125rem !important; }
        body.large-text .text-lg { font-size: 1.5rem !important; }
        body.large-text .text-xl { font-size: 1.75rem !important; }
        body.large-text .text-2xl { font-size: 2rem !important; }
        body.large-text button { padding: 1rem 1.5rem !important; font-size: 1.25rem !important; }
      `;
      if (!document.getElementById('large-text-override')) {
        document.head.appendChild(style);
      }
    } else {
      body.classList.remove('large-text');
      const existingStyle = document.getElementById('large-text-override');
      if (existingStyle) existingStyle.remove();
    }
    
    // Screen Reader
    if (newSettings.screenReader) {
      body.setAttribute('aria-live', 'polite');
      body.classList.add('screen-reader-enabled');
    } else {
      body.removeAttribute('aria-live');
      body.classList.remove('screen-reader-enabled');
    }
    
    // Vibration
    if (newSettings.vibrationAlerts) {
      body.classList.add('vibration-enabled');
    } else {
      body.classList.remove('vibration-enabled');
    }
  };
  
  const handleToggle = (setting) => {
    toggleSetting(setting);
    const settingNames = {
      highContrast: 'High Contrast',
      largeText: 'Large Text', 
      screenReader: 'Screen Reader',
      vibrationAlerts: 'Vibration Alerts'
    };
    const status = !settings[setting] ? 'enabled' : 'disabled';
    announceToScreenReader(`${settingNames[setting]} ${status}`);
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 mb-8 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
        <span>♿</span>
        <span>Accessibility Controls</span>
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => handleToggle('highContrast')}
          className={`accessibility-button p-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center space-y-2 relative ${
            settings.highContrast 
              ? 'bg-yellow-600/30 text-yellow-300 border-2 border-yellow-400 active' 
              : 'bg-white/5 text-slate-300 hover:bg-white/10 border-2 border-white/10'
          }`}
          aria-pressed={settings.highContrast}
          aria-label={`High Contrast Mode ${settings.highContrast ? 'enabled' : 'disabled'}`}
        >
          <span className="text-2xl" role="img" aria-label="High contrast icon">🌓</span>
          <span>High Contrast</span>
          <span className="text-xs opacity-75">{settings.highContrast ? 'ON' : 'OFF'}</span>
        </button>
        <button 
          onClick={() => handleToggle('largeText')}
          className={`accessibility-button p-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center space-y-2 relative ${
            settings.largeText 
              ? 'bg-blue-600/30 text-blue-300 border-2 border-blue-400 active' 
              : 'bg-white/5 text-slate-300 hover:bg-white/10 border-2 border-white/10'
          }`}
          aria-pressed={settings.largeText}
          aria-label={`Large Text Mode ${settings.largeText ? 'enabled' : 'disabled'}`}
        >
          <span className="text-2xl" role="img" aria-label="Large text icon">🔍</span>
          <span>Large Text</span>
          <span className="text-xs opacity-75">{settings.largeText ? 'ON' : 'OFF'}</span>
        </button>
        <button 
          onClick={() => handleToggle('screenReader')}
          className={`accessibility-button p-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center space-y-2 relative ${
            settings.screenReader 
              ? 'bg-green-600/30 text-green-300 border-2 border-green-400 active' 
              : 'bg-white/5 text-slate-300 hover:bg-white/10 border-2 border-white/10'
          }`}
          aria-pressed={settings.screenReader}
          aria-label={`Screen Reader Mode ${settings.screenReader ? 'enabled' : 'disabled'}`}
        >
          <span className="text-2xl" role="img" aria-label="Screen reader icon">🔊</span>
          <span>Screen Reader</span>
          <span className="text-xs opacity-75">{settings.screenReader ? 'ON' : 'OFF'}</span>
        </button>
        <button 
          onClick={() => handleToggle('vibrationAlerts')}
          className={`accessibility-button p-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center space-y-2 relative ${
            settings.vibrationAlerts 
              ? 'bg-purple-600/30 text-purple-300 border-2 border-purple-400 active' 
              : 'bg-white/5 text-slate-300 hover:bg-white/10 border-2 border-white/10'
          }`}
          aria-pressed={settings.vibrationAlerts}
          aria-label={`Vibration Alerts ${settings.vibrationAlerts ? 'enabled' : 'disabled'}`}
        >
          <span className="text-2xl" role="img" aria-label="Vibration icon">📳</span>
          <span>Vibration Alerts</span>
          <span className="text-xs opacity-75">{settings.vibrationAlerts ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
};

export default GlobalAccessibility;