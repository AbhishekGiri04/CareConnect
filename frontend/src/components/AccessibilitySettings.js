import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AccessibilitySettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    gestureEnabled: true,
    audioFeedback: true,
    vibrationAlerts: true,
    fontSize: 'medium',
    highContrast: false,
    largeText: false,
    screenReader: false,
    disability: {
      type: 'none',
      description: '',
      assistiveDevices: []
    }
  });
  const [loading, setLoading] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);

  useEffect(() => {
    loadAccessibilityPreferences();
    if (user?.preferences) {
      setSettings({
        ...settings,
        ...user.preferences,
        disability: user.disability || settings.disability
      });
    }
  }, [user]);

  // Load Accessibility Preferences from localStorage
  const loadAccessibilityPreferences = () => {
    const highContrast = localStorage.getItem('highContrast') === 'true';
    const largeText = localStorage.getItem('largeText') === 'true';
    const screenReader = localStorage.getItem('screenReader') === 'true';
    const vibration = localStorage.getItem('vibration') !== 'false';
    
    setIsHighContrast(highContrast);
    setIsLargeText(largeText);
    setIsScreenReaderEnabled(screenReader);
    setIsVibrationEnabled(vibration);
    
    // Apply preferences to body
    if (highContrast) {
      document.body.classList.add('high-contrast');
    }
    if (largeText) {
      document.body.classList.add('large-text');
    }
    
    setSettings(prev => ({
      ...prev,
      highContrast,
      largeText,
      screenReader,
      vibrationAlerts: vibration
    }));
  };

  // Screen Reader Announcements
  const announceToScreenReader = (text) => {
    if (window.speechSynthesis && isScreenReaderEnabled) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle High Contrast
  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    document.body.classList.toggle('high-contrast', newValue);
    localStorage.setItem('highContrast', newValue);
    setSettings(prev => ({ ...prev, highContrast: newValue }));
    announceToScreenReader(newValue ? 'High contrast mode enabled' : 'High contrast mode disabled');
  };

  // Toggle Large Text
  const toggleLargeText = () => {
    const newValue = !isLargeText;
    setIsLargeText(newValue);
    document.body.classList.toggle('large-text', newValue);
    localStorage.setItem('largeText', newValue);
    setSettings(prev => ({ ...prev, largeText: newValue }));
    announceToScreenReader(newValue ? 'Large text mode enabled' : 'Large text mode disabled');
  };

  // Toggle Screen Reader
  const toggleScreenReader = () => {
    const newValue = !isScreenReaderEnabled;
    setIsScreenReaderEnabled(newValue);
    localStorage.setItem('screenReader', newValue);
    setSettings(prev => ({ ...prev, screenReader: newValue }));
    
    if (newValue) {
      announceToScreenReader('Screen reader enabled. I will now announce all actions.');
    }
  };

  // Toggle Vibration
  const toggleVibration = () => {
    const newValue = !isVibrationEnabled;
    setIsVibrationEnabled(newValue);
    localStorage.setItem('vibration', newValue);
    setSettings(prev => ({ ...prev, vibrationAlerts: newValue }));
    
    if (newValue && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    announceToScreenReader(newValue ? 'Vibration alerts enabled' : 'Vibration alerts disabled');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/auth/profile', {
        preferences: {
          voiceEnabled: settings.voiceEnabled,
          gestureEnabled: settings.gestureEnabled,
          audioFeedback: settings.audioFeedback,
          vibrationAlerts: settings.vibrationAlerts,
          fontSize: settings.fontSize,
          highContrast: settings.highContrast,
          largeText: settings.largeText,
          screenReader: settings.screenReader
        },
        disability: settings.disability
      });
      announceToScreenReader('Settings saved successfully!');
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      announceToScreenReader('Error saving settings');
      alert('Error saving settings');
    }
    setLoading(false);
  };

  const handleDisabilityChange = (field, value) => {
    setSettings({
      ...settings,
      disability: {
        ...settings.disability,
        [field]: value
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Accessibility Settings</h2>
      
      {/* Disability Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Disability Type
        </label>
        <select
          value={settings.disability.type}
          onChange={(e) => handleDisabilityChange('type', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="none">None</option>
          <option value="mobility">Mobility Impairment</option>
          <option value="visual">Visual Impairment</option>
          <option value="cognitive">Cognitive Impairment</option>
          <option value="hearing">Hearing Impairment</option>
        </select>
      </div>

      {/* Disability Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </label>
        <textarea
          value={settings.disability.description}
          onChange={(e) => handleDisabilityChange('description', e.target.value)}
          placeholder="Describe your specific needs or conditions..."
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="3"
        />
      </div>

      {/* Control Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Control Methods</h3>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-800">Voice Control</h4>
              <p className="text-sm text-gray-600">Control devices with voice commands</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.voiceEnabled}
                onChange={(e) => setSettings({...settings, voiceEnabled: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-800">Gesture Control</h4>
              <p className="text-sm text-gray-600">Control devices with hand gestures</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.gestureEnabled}
                onChange={(e) => setSettings({...settings, gestureEnabled: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Feedback Options</h3>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-800">Audio Feedback</h4>
              <p className="text-sm text-gray-600">Spoken confirmations and status</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.audioFeedback}
                onChange={(e) => setSettings({...settings, audioFeedback: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-800">Vibration Alerts</h4>
              <p className="text-sm text-gray-600">Haptic feedback for notifications</p>
            </div>
            <button
              onClick={toggleVibration}
              className={`w-11 h-6 rounded-full transition-colors ${isVibrationEnabled ? 'bg-blue-600' : 'bg-gray-200'} relative`}
              aria-label="Toggle vibration alerts"
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isVibrationEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Settings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Visual Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Size
            </label>
            <select
              value={settings.fontSize}
              onChange={(e) => setSettings({...settings, fontSize: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-800">High Contrast</h4>
              <p className="text-sm text-gray-600">Enhanced visibility</p>
            </div>
            <button
              onClick={toggleHighContrast}
              className={`w-11 h-6 rounded-full transition-colors ${isHighContrast ? 'bg-blue-600' : 'bg-gray-200'} relative`}
              aria-label="Toggle high contrast mode"
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isHighContrast ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-800">Large Text</h4>
              <p className="text-sm text-gray-600">Bigger font size for better readability</p>
            </div>
            <button
              onClick={toggleLargeText}
              className={`w-11 h-6 rounded-full transition-colors ${isLargeText ? 'bg-blue-600' : 'bg-gray-200'} relative`}
              aria-label="Toggle large text mode"
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isLargeText ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-800">Screen Reader</h4>
              <p className="text-sm text-gray-600">Audio announcements for all actions</p>
            </div>
            <button
              onClick={toggleScreenReader}
              className={`w-11 h-6 rounded-full transition-colors ${isScreenReaderEnabled ? 'bg-blue-600' : 'bg-gray-200'} relative`}
              aria-label="Toggle screen reader"
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isScreenReaderEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Settings */}
      {settings.disability.type !== 'none' && (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Recommended Settings for {settings.disability.type.charAt(0).toUpperCase() + settings.disability.type.slice(1)} Impairment
          </h3>
          <div className="text-sm text-blue-700">
            {settings.disability.type === 'mobility' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Enable voice control for hands-free operation</li>
                <li>Enable gesture control for limited movement</li>
                <li>Enable audio feedback for confirmation</li>
              </ul>
            )}
            {settings.disability.type === 'visual' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Enable screen reader for audio feedback</li>
                <li>Enable large text mode for better readability</li>
                <li>Enable high contrast mode for better visibility</li>
                <li>Enable vibration alerts for notifications</li>
                <li>Use extra-large font size</li>
              </ul>
            )}
            {settings.disability.type === 'hearing' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Enable vibration alerts for all notifications</li>
                <li>Enable visual feedback indicators</li>
                <li>Use gesture control for silent operation</li>
                <li>Enable high contrast for better visual cues</li>
              </ul>
            )}
            {settings.disability.type === 'cognitive' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Enable audio feedback for guidance</li>
                <li>Use large font size for better readability</li>
                <li>Enable vibration alerts for important notifications</li>
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default AccessibilitySettings;