import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    highContrast: false,
    largeText: false,
    screenReader: false,
    vibrationAlerts: true
  });

  // Load settings from localStorage on mount and sync globally
  useEffect(() => {
    const highContrast = localStorage.getItem('highContrast') === 'true';
    const largeText = localStorage.getItem('largeText') === 'true';
    const screenReader = localStorage.getItem('screenReader') === 'true';
    const vibrationAlerts = localStorage.getItem('vibration') !== 'false';
    
    const newSettings = {
      highContrast,
      largeText,
      screenReader,
      vibrationAlerts
    };
    
    setSettings(newSettings);
    applySettings(newSettings);
    
    // Listen for accessibility changes from backend/other parts
    const handleAccessibilityChange = (event) => {
      const backendSettings = event.detail;
      const updatedSettings = { ...newSettings, ...backendSettings };
      setSettings(updatedSettings);
      applySettings(updatedSettings);
    };
    
    window.addEventListener('accessibilityChange', handleAccessibilityChange);
    
    return () => {
      window.removeEventListener('accessibilityChange', handleAccessibilityChange);
    };
  }, []);

  // Apply settings globally across entire project
  const applySettings = (newSettings) => {
    const body = document.body;
    const html = document.documentElement;
    
    // High Contrast - Apply to entire project
    if (newSettings.highContrast) {
      body.classList.add('high-contrast');
      html.classList.add('high-contrast');
      let style = document.getElementById('hc-override');
      if (!style) {
        style = document.createElement('style');
        style.id = 'hc-override';
        document.head.appendChild(style);
      }
      style.textContent = `
        html.high-contrast, html.high-contrast body, html.high-contrast *,
        body.high-contrast, body.high-contrast *,
        .high-contrast, .high-contrast * {
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
        html.high-contrast button:hover, html.high-contrast button.active,
        body.high-contrast button:hover, body.high-contrast button.active {
          background: #ffff00 !important;
          color: #000000 !important;
        }
        html.high-contrast .glass, html.high-contrast [class*="bg-"],
        body.high-contrast .glass, body.high-contrast [class*="bg-"] {
          background: #000000 !important;
          border: 2px solid #ffffff !important;
        }
        html.high-contrast input, html.high-contrast textarea, html.high-contrast select,
        body.high-contrast input, body.high-contrast textarea, body.high-contrast select {
          background: #ffffff !important;
          color: #000000 !important;
          border: 2px solid #000000 !important;
        }
      `;
    } else {
      body.classList.remove('high-contrast');
      html.classList.remove('high-contrast');
      const style = document.getElementById('hc-override');
      if (style) style.remove();
    }
    
    // Large Text - Apply to entire project
    if (newSettings.largeText) {
      body.classList.add('large-text');
      html.classList.add('large-text');
      let style = document.getElementById('lt-override');
      if (!style) {
        style = document.createElement('style');
        style.id = 'lt-override';
        document.head.appendChild(style);
      }
      style.textContent = `
        html.large-text, html.large-text body, body.large-text,
        .large-text, .large-text * { font-size: 1.25em !important; }
        html.large-text *, body.large-text *, .large-text * { font-size: inherit !important; }
        html.large-text .text-xs, body.large-text .text-xs { font-size: 1rem !important; }
        html.large-text .text-sm, body.large-text .text-sm { font-size: 1.125rem !important; }
        html.large-text .text-lg, body.large-text .text-lg { font-size: 1.5rem !important; }
        html.large-text .text-xl, body.large-text .text-xl { font-size: 1.75rem !important; }
        html.large-text .text-2xl, body.large-text .text-2xl { font-size: 2rem !important; }
        html.large-text button, body.large-text button { padding: 1rem 1.5rem !important; font-size: 1.25rem !important; }
        html.large-text h1, body.large-text h1 { font-size: 2.5rem !important; }
        html.large-text h2, body.large-text h2 { font-size: 2rem !important; }
        html.large-text h3, body.large-text h3 { font-size: 1.75rem !important; }
        html.large-text p, body.large-text p { font-size: 1.25rem !important; }
      `;
    } else {
      body.classList.remove('large-text');
      html.classList.remove('large-text');
      const style = document.getElementById('lt-override');
      if (style) style.remove();
    }
    
    // Screen Reader - Apply globally
    if (newSettings.screenReader) {
      body.setAttribute('aria-live', 'polite');
      html.setAttribute('aria-live', 'polite');
      body.classList.add('screen-reader-enabled');
      html.classList.add('screen-reader-enabled');
    } else {
      body.removeAttribute('aria-live');
      html.removeAttribute('aria-live');
      body.classList.remove('screen-reader-enabled');
      html.classList.remove('screen-reader-enabled');
    }
    
    // Vibration - Apply globally
    if (newSettings.vibrationAlerts) {
      body.classList.add('vibration-enabled');
      html.classList.add('vibration-enabled');
    } else {
      body.classList.remove('vibration-enabled');
      html.classList.remove('vibration-enabled');
    }
    
    // Store in global window object for cross-component access
    window.accessibilitySettings = newSettings;
  };

  // Screen Reader Announcements
  const announceToScreenReader = (text) => {
    if (window.speechSynthesis && settings.screenReader) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle setting with immediate DOM update
  const toggleSetting = (settingName) => {
    const newValue = !settings[settingName];
    const newSettings = {
      ...settings,
      [settingName]: newValue
    };
    
    // Update state
    setSettings(newSettings);
    
    // Apply immediately to DOM
    applySettings(newSettings);
    
    // Save to localStorage and sync across project
    localStorage.setItem('highContrast', newSettings.highContrast);
    localStorage.setItem('largeText', newSettings.largeText);
    localStorage.setItem('screenReader', newSettings.screenReader);
    localStorage.setItem('vibration', newSettings.vibrationAlerts);
    
    // Broadcast to entire project (frontend + backend)
    window.dispatchEvent(new CustomEvent('accessibilityChange', {
      detail: newSettings
    }));
    
    // Update global window object for cross-system access
    window.accessibilitySettings = newSettings;
    
    // Sync with backend if available
    if (window.parent && window.parent !== window) {
      window.parent.dispatchEvent(new CustomEvent('accessibilityChange', {
        detail: newSettings
      }));
    }
    
    // Provide feedback
    const settingNames = {
      highContrast: 'High Contrast',
      largeText: 'Large Text',
      screenReader: 'Screen Reader',
      vibrationAlerts: 'Vibration Alerts'
    };
    
    const status = newValue ? 'enabled' : 'disabled';
    
    // Voice feedback
    if (window.speechSynthesis && newSettings.screenReader) {
      const utterance = new SpeechSynthesisUtterance(`${settingNames[settingName]} ${status}`);
      utterance.rate = 0.8;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    }
    
    // Vibration feedback
    if (navigator.vibrate && newSettings.vibrationAlerts) {
      navigator.vibrate([100, 50, 100]);
    }
    
    console.log(`🔧 ${settingNames[settingName]}: ${status.toUpperCase()}`);
  };

  const value = {
    settings,
    toggleSetting,
    announceToScreenReader,
    applySettings
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};