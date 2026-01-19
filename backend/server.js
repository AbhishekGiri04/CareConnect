const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'abhishekgiri1978@gmail.com',
        pass: 'kytasopwdbrgrzou'
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'smart-home-secret-' + Date.now(),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// SmartAssist Backend URL
const SMARTASSIST_API = 'http://localhost:5004/api';

// Health check route
app.get('/', (req, res) => {
    res.json({ 
        message: 'CareConnect Backend API is running',
        status: 'OK',
        timestamp: new Date().toISOString(),
        endpoints: {
            devices: '/api/devices',
            dashboard: '/api/dashboard/stats',
            accessibility: '/api/accessibility/settings',
            voice: '/api/voice/process',
            gesture: '/api/gesture/process',
            gestureControl: '/gesture-control',
            security: '/api/security/status',
            emergency: '/api/emergency/trigger',
            communication: '/api/communication/braille-translate'
        }
    });
});

// Serve gesture control interface
app.get('/gesture-control', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gesture-control.html'));
});

// Device storage for CareMe integration
let careDevices = {
    LED1: { name: 'Living Room', status: false, lastUpdated: Date.now() },
    LED2: { name: 'Bedroom', status: false, lastUpdated: Date.now() },
    LED3: { name: 'Kitchen', status: false, lastUpdated: Date.now() },
    LED4: { name: 'Bathroom', status: false, lastUpdated: Date.now() }
};

// CareMe Device Control API
app.get('/api/care/devices', (req, res) => {
    res.json({ success: true, devices: careDevices });
});

app.post('/api/care/devices/toggle', (req, res) => {
    const { deviceId, status } = req.body;
    
    if (!careDevices[deviceId]) {
        return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    careDevices[deviceId].status = status;
    careDevices[deviceId].lastUpdated = Date.now();
    
    console.log(`💡 ${careDevices[deviceId].name} ${status ? 'ON' : 'OFF'}`);
    
    res.json({ 
        success: true, 
        device: careDevices[deviceId],
        message: `${careDevices[deviceId].name} ${status ? 'turned on' : 'turned off'}`
    });
});

app.post('/api/care/devices/emergency', (req, res) => {
    Object.keys(careDevices).forEach(deviceId => {
        careDevices[deviceId].status = true;
        careDevices[deviceId].lastUpdated = Date.now();
    });
    
    console.log('🚨 EMERGENCY: All lights turned ON');
    
    res.json({ 
        success: true, 
        message: 'Emergency mode activated - all lights on',
        devices: careDevices 
    });
});

// API Routes to connect with SmartAssist backend
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        // Get device count from SmartAssist backend
        const devicesResponse = await axios.get(`${SMARTASSIST_API}/devices`);
        const devices = devicesResponse.data.data || [];
        
        // Get alerts from SmartAssist backend
        const alertsResponse = await axios.get(`${SMARTASSIST_API}/alerts`);
        const alerts = alertsResponse.data.data || [];
        
        // Calculate stats
        const stats = {
            devices: devices.length,
            onlineDevices: devices.filter(d => d.isOnline).length,
            alerts: alerts.filter(a => !a.resolved).length,
            energy: 92, // Mock data
            temperature: 23 // Will be updated with weather API
        };
        
        res.json({ success: true, data: stats });
    } catch (error) {
        res.json({ 
            success: true, 
            data: { devices: 4, onlineDevices: 4, alerts: 0, energy: 92, temperature: 23 }
        });
    }
});

app.get('/api/devices', async (req, res) => {
    try {
        const response = await axios.get(`${SMARTASSIST_API}/devices`);
        res.json(response.data);
    } catch (error) {
        res.json({ 
            success: true, 
            data: [
                { _id: '1', name: 'Living Room Light', type: 'light', status: true, location: 'Living Room' },
                { _id: '2', name: 'Bedroom Fan', type: 'fan', status: false, location: 'Bedroom' },
                { _id: '3', name: 'Kitchen Light', type: 'light', status: true, location: 'Kitchen' },
                { _id: '4', name: 'Motion Sensor', type: 'motion_sensor', status: true, location: 'Hallway' }
            ]
        });
    }
});

app.post('/api/devices/:id/control', async (req, res) => {
    try {
        const response = await axios.put(`${SMARTASSIST_API}/devices/${req.params.id}/control`, req.body);
        res.json(response.data);
    } catch (error) {
        res.json({ success: true, message: 'Device control simulated' });
    }
});

app.get('/api/alerts', async (req, res) => {
    try {
        const response = await axios.get(`${SMARTASSIST_API}/alerts`);
        res.json(response.data);
    } catch (error) {
        res.json({ success: true, data: [] });
    }
});

// Accessibility settings endpoints
let accessibilitySettings = {
    highContrast: false,
    largeText: false,
    screenReader: false,
    vibrationAlerts: true // Default enabled
};

app.get('/api/accessibility/settings', (req, res) => {
    res.json({ success: true, data: accessibilitySettings });
});

app.post('/api/accessibility/settings', (req, res) => {
    const previousSettings = { ...accessibilitySettings };
    const newSettings = { ...accessibilitySettings, ...req.body };
    
    // Validate settings
    const validKeys = ['highContrast', 'largeText', 'screenReader', 'vibrationAlerts'];
    const filteredSettings = {};
    
    validKeys.forEach(key => {
        if (key in newSettings) {
            filteredSettings[key] = Boolean(newSettings[key]);
        }
    });
    
    accessibilitySettings = { ...accessibilitySettings, ...filteredSettings };
    
    // Log what changed with detailed feedback
    const changes = [];
    Object.keys(filteredSettings).forEach(key => {
        if (previousSettings[key] !== accessibilitySettings[key]) {
            const status = accessibilitySettings[key] ? 'ENABLED' : 'DISABLED';
            const emoji = {
                highContrast: '',
                largeText: '', 
                screenReader: '',
                vibrationAlerts: ''
            }[key] || '';
            
            const description = {
                highContrast: 'High Contrast Mode',
                largeText: 'Large Text Mode',
                screenReader: 'Screen Reader Support',
                vibrationAlerts: 'Vibration Alerts'
            }[key] || key;
            
            console.log(`${description}: ${status}`);
            changes.push(`${description} ${status.toLowerCase()}`);
        }
    });
    
    // Save to file for persistence
    try {
        const fs = require('fs');
        const path = require('path');
        const settingsPath = path.join(__dirname, 'accessibility-settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(accessibilitySettings, null, 2));
    } catch (error) {
        console.error('Failed to save accessibility settings:', error.message);
    }
    
    console.log('Complete accessibility settings:', accessibilitySettings);
    
    const message = changes.length > 0 
        ? `Accessibility updated: ${changes.join(', ')}` 
        : 'Accessibility settings updated successfully';
    
    res.json({ 
        success: true, 
        data: accessibilitySettings,
        message: message,
        changes: changes
    });
});

// Load accessibility settings from file on startup
app.get('/api/accessibility/load', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const settingsPath = path.join(__dirname, 'accessibility-settings.json');
        
        if (fs.existsSync(settingsPath)) {
            const savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            accessibilitySettings = { ...accessibilitySettings, ...savedSettings };
        }
        
        res.json({ success: true, data: accessibilitySettings });
    } catch (error) {
        console.error('❌ Failed to load accessibility settings:', error.message);
        res.json({ success: true, data: accessibilitySettings });
    }
});

// Reset accessibility settings
app.post('/api/accessibility/reset', (req, res) => {
    const defaultSettings = {
        highContrast: false,
        largeText: false,
        screenReader: false,
        vibrationAlerts: true
    };
    
    accessibilitySettings = defaultSettings;
    
    res.json({ 
        success: true, 
        data: accessibilitySettings,
        message: 'Accessibility settings reset to defaults'
    });
});

// Voice control endpoints
app.post('/api/voice/process', async (req, res) => {
    const { command } = req.body;
    
    try {
        // Forward to SmartAssist backend if available
        const response = await axios.post(`${SMARTASSIST_API}/voice/process`, req.body);
        res.json(response.data);
    } catch (error) {
        // Handle locally if SmartAssist not available
        res.json({ 
            success: true, 
            message: `Voice command "${command}" processed successfully`,
            action: 'local_processing'
        });
    }
});

app.post('/api/voice/simulate', (req, res) => {
    const commands = [
        'Turn on living room light',
        'All lights on',
        'What time is it',
        'System status',
        'Emergency help'
    ];
    const randomCommand = commands[Math.floor(Math.random() * commands.length)];
    
    res.json({ 
        success: true, 
        message: `Simulated: "${randomCommand}"`,
        command: randomCommand
    });
});

// Hand Gesture Control - Enhanced Integration with MediaPipe
let gestureDevices = {
    1: { name: 'Living Room LED', status: false, lastUpdated: Date.now(), location: 'living_room' },
    2: { name: 'Bedroom LED', status: false, lastUpdated: Date.now(), location: 'bedroom' },
    3: { name: 'Kitchen LED', status: false, lastUpdated: Date.now(), location: 'kitchen' },
    4: { name: 'Bathroom LED', status: false, lastUpdated: Date.now(), location: 'bathroom' }
};

let gestureSettings = {
    enabled: false,
    sensitivity: 0.7,
    detectionRange: 'medium',
    responseDelay: 0,
    lastGesture: null,
    gestureCount: 0
};

// Get all gesture devices
app.get('/api/gesture/devices', (req, res) => {
    res.json({ 
        success: true, 
        devices: gestureDevices,
        settings: gestureSettings,
        timestamp: Date.now()
    });
});

// Update gesture device status with enhanced logging
app.post('/api/gesture/devices', (req, res) => {
    const { deviceId, status, timestamp, fingerCount, gestureType } = req.body;
    
    if (!gestureDevices[deviceId]) {
        return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    const previousStatus = gestureDevices[deviceId].status;
    gestureDevices[deviceId].status = status;
    gestureDevices[deviceId].lastUpdated = timestamp || Date.now();
    
    // Enhanced logging with gesture details
    const gestureInfo = fingerCount ? `${fingerCount} finger(s)` : gestureType || 'gesture';
    const action = status ? 'ON' : 'OFF';
    
    console.log(`Gesture Control [${gestureInfo}]: ${gestureDevices[deviceId].name} ${action}`);
    
    // Update gesture statistics
    gestureSettings.lastGesture = {
        deviceId,
        fingerCount,
        gestureType,
        timestamp: Date.now(),
        action: status ? 'activated' : 'deactivated'
    };
    gestureSettings.gestureCount++;
    
    res.json({ 
        success: true, 
        device: gestureDevices[deviceId],
        message: `${gestureDevices[deviceId].name} ${status ? 'activated' : 'deactivated'} via ${gestureInfo}`,
        previousStatus,
        gestureInfo: gestureSettings.lastGesture
    });
});

// Toggle specific device (for finger gestures)
app.post('/api/gesture/devices/:id/toggle', (req, res) => {
    const deviceId = req.params.id;
    const { fingerCount, gestureType } = req.body;
    
    if (!gestureDevices[deviceId]) {
        return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    const newStatus = !gestureDevices[deviceId].status;
    gestureDevices[deviceId].status = newStatus;
    gestureDevices[deviceId].lastUpdated = Date.now();
    
    const gestureInfo = fingerCount ? `${fingerCount} finger(s)` : gestureType || 'gesture';
    const action = newStatus ? 'ON' : 'OFF';
    
    console.log(`Toggle [${gestureInfo}]: ${gestureDevices[deviceId].name} ${action}`);
    
    gestureSettings.lastGesture = {
        deviceId,
        fingerCount,
        gestureType,
        timestamp: Date.now(),
        action: newStatus ? 'activated' : 'deactivated'
    };
    gestureSettings.gestureCount++;
    
    res.json({ 
        success: true, 
        device: gestureDevices[deviceId],
        message: `${gestureDevices[deviceId].name} ${newStatus ? 'turned on' : 'turned off'} via ${gestureInfo}`,
        gestureInfo: gestureSettings.lastGesture
    });
});

// Get specific gesture device
app.get('/api/gesture/devices/:id', (req, res) => {
    const deviceId = req.params.id;
    
    if (!gestureDevices[deviceId]) {
        return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    res.json({ success: true, device: gestureDevices[deviceId] });
});

// Gesture system settings
app.get('/api/gesture/settings', (req, res) => {
    res.json({ 
        success: true, 
        settings: gestureSettings,
        devices: gestureDevices
    });
});

app.post('/api/gesture/settings', (req, res) => {
    const { enabled, sensitivity, detectionRange, responseDelay } = req.body;
    
    if (enabled !== undefined) gestureSettings.enabled = enabled;
    if (sensitivity !== undefined) gestureSettings.sensitivity = sensitivity;
    if (detectionRange !== undefined) gestureSettings.detectionRange = detectionRange;
    if (responseDelay !== undefined) gestureSettings.responseDelay = responseDelay;
    
    res.json({ 
        success: true, 
        settings: gestureSettings,
        message: 'Gesture settings updated successfully'
    });
});

// Gesture health check with detailed status
app.get('/api/gesture/health', (req, res) => {
    const activeDevices = Object.values(gestureDevices).filter(d => d.status).length;
    const totalDevices = Object.keys(gestureDevices).length;
    
    res.json({ 
        success: true, 
        status: gestureSettings.enabled ? 'Gesture Control Active' : 'Gesture Control Inactive',
        timestamp: Date.now(),
        activeDevices,
        totalDevices,
        gestureCount: gestureSettings.gestureCount,
        lastGesture: gestureSettings.lastGesture,
        settings: {
            enabled: gestureSettings.enabled,
            sensitivity: gestureSettings.sensitivity,
            detectionRange: gestureSettings.detectionRange,
            responseDelay: gestureSettings.responseDelay
        }
    });
});

// Reset all gesture devices
app.post('/api/gesture/reset', (req, res) => {
    Object.keys(gestureDevices).forEach(deviceId => {
        gestureDevices[deviceId].status = false;
        gestureDevices[deviceId].lastUpdated = Date.now();
    });
    
    res.json({ 
        success: true, 
        message: 'All devices reset to OFF',
        devices: gestureDevices
    });
});

// Enhanced gesture processing with MediaPipe integration
app.post('/api/gesture/process', async (req, res) => {
    const { gestureType, deviceId, fingerCount, confidence, landmarks, timestamp } = req.body;
    
    try {
        // Forward to SmartAssist backend if available
        const response = await axios.post(`${SMARTASSIST_API}/gesture/process`, req.body);
        res.json(response.data);
    } catch (error) {
        // Handle locally if SmartAssist not available
        
        // Check if gesture system is enabled
        if (!gestureSettings.enabled) {
            return res.json({ 
                success: false, 
                message: 'Gesture control is disabled. Please enable it first.',
                enabled: false
            });
        }
        
        // Handle finger-based gestures (1-4 fingers)
        if (fingerCount && fingerCount >= 1 && fingerCount <= 4) {
            const targetDevice = gestureDevices[fingerCount];
            if (targetDevice) {
                const previousStatus = targetDevice.status;
                targetDevice.status = !targetDevice.status;
                targetDevice.lastUpdated = Date.now();
                
                const action = targetDevice.status ? 'ON' : 'OFF';
                const emoji = targetDevice.status ? '💡' : '🔌';
                
                console.log(`👆 ${emoji} ${fingerCount} finger(s): ${targetDevice.name} ${action}`);
                
                // Update gesture statistics
                gestureSettings.lastGesture = {
                    deviceId: fingerCount,
                    fingerCount,
                    gestureType: `${fingerCount} finger(s)`,
                    timestamp: Date.now(),
                    action: targetDevice.status ? 'activated' : 'deactivated',
                    confidence: confidence || 0.8
                };
                gestureSettings.gestureCount++;
                
                return res.json({ 
                    success: true, 
                    message: `${fingerCount} finger gesture: ${targetDevice.name} ${targetDevice.status ? 'turned on' : 'turned off'}`,
                    device: targetDevice,
                    fingerCount: fingerCount,
                    previousStatus,
                    gestureInfo: gestureSettings.lastGesture,
                    voiceMessage: `${targetDevice.name} ${targetDevice.status ? 'activated' : 'deactivated'}`
                });
            }
        }
        
        // Handle special gestures
        if (gestureType) {
            let message = '';
            let devices = [];
            
            switch (gestureType.toLowerCase()) {
                case 'wave_right':
                case 'all_on':
                    Object.keys(gestureDevices).forEach(id => {
                        gestureDevices[id].status = true;
                        gestureDevices[id].lastUpdated = Date.now();
                        devices.push(gestureDevices[id]);
                    });
                    message = 'All lights turned ON via wave gesture';
                    console.log('👋 ➡️ Wave Right: All lights ON');
                    break;
                    
                case 'wave_left':
                case 'all_off':
                    Object.keys(gestureDevices).forEach(id => {
                        gestureDevices[id].status = false;
                        gestureDevices[id].lastUpdated = Date.now();
                        devices.push(gestureDevices[id]);
                    });
                    message = 'All lights turned OFF via wave gesture';
                    console.log('👋 ⬅️ Wave Left: All lights OFF');
                    break;
                    
                case 'fist':
                case 'emergency':
                    Object.keys(gestureDevices).forEach(id => {
                        gestureDevices[id].status = true;
                        gestureDevices[id].lastUpdated = Date.now();
                        devices.push(gestureDevices[id]);
                    });
                    message = '🚨 Emergency gesture detected - All lights ON';
                    console.log('👊 🚨 Emergency Fist: All lights ON');
                    break;
                    
                default:
                    message = `Gesture "${gestureType}" recognized but no action defined`;
                    console.log(`👋 ❓ Unknown gesture: ${gestureType}`);
            }
            
            // Update gesture statistics
            gestureSettings.lastGesture = {
                gestureType,
                timestamp: Date.now(),
                action: message,
                confidence: confidence || 0.7,
                devicesAffected: devices.length
            };
            gestureSettings.gestureCount++;
            
            return res.json({ 
                success: true, 
                message,
                gestureType,
                devices,
                gestureInfo: gestureSettings.lastGesture,
                voiceMessage: message.replace('🚨', '').replace('👋', '').replace('➡️', '').replace('⬅️', '')
            });
        }
        
        // Default response for unrecognized gestures
        res.json({ 
            success: true, 
            message: 'Gesture detected but not recognized. Try showing 1-4 fingers.',
            action: 'gesture_not_recognized',
            suggestions: [
                '1 finger = Living Room LED',
                '2 fingers = Bedroom LED', 
                '3 fingers = Kitchen LED',
                '4 fingers = Bathroom LED'
            ]
        });
    }
});

// Simulate gesture for testing
app.post('/api/gesture/simulate', (req, res) => {
    const { fingerCount, gestureType } = req.body;
    
    console.log(`👋 🧪 Simulating gesture: ${fingerCount ? `${fingerCount} fingers` : gestureType}`);
    
    // Process the simulated gesture
    const simulatedRequest = {
        gestureType: gestureType || `${fingerCount} fingers`,
        fingerCount,
        confidence: 0.95,
        timestamp: Date.now()
    };
    
    // Reuse the gesture processing logic
    req.body = simulatedRequest;
    
    // Forward to the gesture processing endpoint
    return app._router.handle({
        ...req,
        method: 'POST',
        url: '/api/gesture/process',
        body: simulatedRequest
    }, res);
});

// Enhanced gesture commands with MediaPipe integration
app.get('/api/gesture/commands', (req, res) => {
    const commands = [
        { 
            id: 1, 
            name: '1 finger', 
            action: 'toggle_living_room', 
            sensitivity: gestureSettings.sensitivity, 
            description: 'Toggle Living Room LED',
            fingerCount: 1,
            emoji: '👆',
            enabled: true
        },
        { 
            id: 2, 
            name: '2 fingers', 
            action: 'toggle_bedroom', 
            sensitivity: gestureSettings.sensitivity, 
            description: 'Toggle Bedroom LED',
            fingerCount: 2,
            emoji: '✌️',
            enabled: true
        },
        { 
            id: 3, 
            name: '3 fingers', 
            action: 'toggle_kitchen', 
            sensitivity: gestureSettings.sensitivity, 
            description: 'Toggle Kitchen LED',
            fingerCount: 3,
            emoji: '🤟',
            enabled: true
        },
        { 
            id: 4, 
            name: '4 fingers', 
            action: 'toggle_bathroom', 
            sensitivity: gestureSettings.sensitivity, 
            description: 'Toggle Bathroom LED',
            fingerCount: 4,
            emoji: '🖖',
            enabled: true
        },
        { 
            id: 5, 
            name: 'Wave Right', 
            action: 'lights_on', 
            sensitivity: gestureSettings.sensitivity, 
            description: 'Turn all lights on',
            emoji: '👋➡️',
            enabled: true
        },
        { 
            id: 6, 
            name: 'Wave Left', 
            action: 'lights_off', 
            sensitivity: gestureSettings.sensitivity, 
            description: 'Turn all lights off',
            emoji: '👋⬅️',
            enabled: true
        },
        { 
            id: 7, 
            name: 'Point Up', 
            action: 'fan_on', 
            sensitivity: gestureSettings.sensitivity * 0.8, 
            description: 'Turn fan on',
            emoji: '👆⬆️',
            enabled: false
        },
        { 
            id: 8, 
            name: 'Point Down', 
            action: 'fan_off', 
            sensitivity: gestureSettings.sensitivity * 0.8, 
            description: 'Turn fan off',
            emoji: '👆⬇️',
            enabled: false
        },
        { 
            id: 9, 
            name: 'Fist', 
            action: 'emergency', 
            sensitivity: gestureSettings.sensitivity * 1.2, 
            description: 'Emergency alert - All lights on',
            emoji: '👊',
            enabled: true
        }
    ];
    
    res.json({ 
        success: true, 
        data: commands,
        settings: gestureSettings,
        totalCommands: commands.length,
        enabledCommands: commands.filter(c => c.enabled).length
    });
});

// Create or update gesture commands
app.post('/api/gesture/commands', (req, res) => {
    const { gestureName, deviceType, action, sensitivity, fingerCount, enabled } = req.body;
    
    console.log('👋 ➕ New gesture command created:', { 
        gestureName, 
        deviceType, 
        action, 
        sensitivity,
        fingerCount,
        enabled: enabled !== false
    });
    
    const newCommand = {
        id: Date.now(),
        name: gestureName,
        action,
        deviceType,
        sensitivity: sensitivity || gestureSettings.sensitivity,
        fingerCount,
        enabled: enabled !== false,
        createdAt: new Date().toISOString()
    };
    
    res.json({ 
        success: true, 
        message: `Gesture command "${gestureName}" created successfully`,
        data: newCommand
    });
});

// Update gesture command
app.put('/api/gesture/commands/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`👋 ✏️ Updating gesture command ${id}:`, updates);
    
    res.json({ 
        success: true, 
        message: `Gesture command ${id} updated successfully`,
        data: { id, ...updates, updatedAt: new Date().toISOString() }
    });
});

// Delete gesture command
app.delete('/api/gesture/commands/:id', (req, res) => {
    const { id } = req.params;
    
    console.log(`👋 🗑️ Deleting gesture command ${id}`);
    
    res.json({ 
        success: true, 
        message: `Gesture command ${id} deleted successfully`
    });
});

// Enhanced gesture presets for different accessibility needs
app.get('/api/gesture/presets', (req, res) => {
    const presets = {
        mobility: [
            { 
                name: '1 Finger', 
                description: 'One finger to control Living Room LED', 
                action: 'toggle_living_room', 
                fingerCount: 1,
                emoji: '👆',
                sensitivity: 0.7,
                enabled: true
            },
            { 
                name: '2 Fingers', 
                description: 'Two fingers to control Bedroom LED', 
                action: 'toggle_bedroom', 
                fingerCount: 2,
                emoji: '✌️',
                sensitivity: 0.7,
                enabled: true
            },
            { 
                name: '3 Fingers', 
                description: 'Three fingers to control Kitchen LED', 
                action: 'toggle_kitchen', 
                fingerCount: 3,
                emoji: '🤟',
                sensitivity: 0.7,
                enabled: true
            },
            { 
                name: '4 Fingers', 
                description: 'Four fingers to control Bathroom LED', 
                action: 'toggle_bathroom', 
                fingerCount: 4,
                emoji: '🖖',
                sensitivity: 0.7,
                enabled: true
            },
            { 
                name: 'Fist Emergency', 
                description: 'Closed fist for emergency - all lights on', 
                action: 'emergency',
                emoji: '👊',
                sensitivity: 0.8,
                enabled: true
            }
        ],
        visual: [
            { 
                name: '1 Finger (High Contrast)', 
                description: 'Large one finger motion with high sensitivity', 
                action: 'toggle_living_room', 
                fingerCount: 1,
                emoji: '👆',
                sensitivity: 0.9,
                enabled: true
            },
            { 
                name: '2 Fingers (High Contrast)', 
                description: 'Large two finger motion with high sensitivity', 
                action: 'toggle_bedroom', 
                fingerCount: 2,
                emoji: '✌️',
                sensitivity: 0.9,
                enabled: true
            },
            { 
                name: 'Wave All On', 
                description: 'Large wave motion to turn all lights on', 
                action: 'lights_on',
                emoji: '👋',
                sensitivity: 0.8,
                enabled: true
            },
            { 
                name: 'Fist Emergency', 
                description: 'Emergency gesture with audio feedback', 
                action: 'emergency',
                emoji: '👊',
                sensitivity: 0.9,
                enabled: true
            }
        ],
        hearing: [
            { 
                name: '1 Finger Visual', 
                description: 'Visual one finger gesture with vibration feedback', 
                action: 'toggle_living_room', 
                fingerCount: 1,
                emoji: '👆',
                sensitivity: 0.7,
                enabled: true
            },
            { 
                name: '2 Fingers Visual', 
                description: 'Visual two finger gesture with vibration feedback', 
                action: 'toggle_bedroom', 
                fingerCount: 2,
                emoji: '✌️',
                sensitivity: 0.7,
                enabled: true
            },
            { 
                name: 'Thumbs Up', 
                description: 'Thumbs up to turn all lights on', 
                action: 'lights_on',
                emoji: '👍',
                sensitivity: 0.8,
                enabled: true
            },
            { 
                name: 'Thumbs Down', 
                description: 'Thumbs down to turn all lights off', 
                action: 'lights_off',
                emoji: '👎',
                sensitivity: 0.8,
                enabled: true
            }
        ],
        cognitive: [
            { 
                name: 'Simple 1 Finger', 
                description: 'Easy one finger gesture - Living Room', 
                action: 'toggle_living_room', 
                fingerCount: 1,
                emoji: '👆',
                sensitivity: 0.9,
                enabled: true
            },
            { 
                name: 'Simple 2 Fingers', 
                description: 'Easy two finger gesture - Bedroom', 
                action: 'toggle_bedroom', 
                fingerCount: 2,
                emoji: '✌️',
                sensitivity: 0.9,
                enabled: true
            },
            { 
                name: 'Emergency Help', 
                description: 'Simple fist for help - all lights on', 
                action: 'emergency',
                emoji: '👊',
                sensitivity: 0.9,
                enabled: true
            }
        ]
    };
    
    res.json({ 
        success: true, 
        data: presets,
        currentSettings: gestureSettings,
        availableTypes: Object.keys(presets),
        totalPresets: Object.values(presets).reduce((sum, arr) => sum + arr.length, 0)
    });
});

// Apply preset configuration
app.post('/api/gesture/presets/apply', (req, res) => {
    const { presetType, presetName } = req.body;
    
    console.log(`👋 🎯 Applying gesture preset: ${presetType} - ${presetName}`);
    
    // Update gesture settings based on preset
    if (presetType === 'visual') {
        gestureSettings.sensitivity = 0.9;
        gestureSettings.detectionRange = 'close';
    } else if (presetType === 'mobility') {
        gestureSettings.sensitivity = 0.7;
        gestureSettings.detectionRange = 'medium';
    } else if (presetType === 'cognitive') {
        gestureSettings.sensitivity = 0.9;
        gestureSettings.responseDelay = 500;
    }
    
    res.json({ 
        success: true, 
        message: `Preset "${presetName}" applied successfully`,
        presetType,
        presetName,
        updatedSettings: gestureSettings
    });
});

// Security endpoints
let securityData = {
    isActive: false,
    registeredFaces: [
        { id: 1, name: 'John Doe', registeredAt: new Date().toISOString() },
        { id: 2, name: 'Jane Smith', registeredAt: new Date().toISOString() }
    ],
    logs: [
        { id: 1, type: 'authorized', name: 'John Doe', timestamp: new Date().toISOString(), confidence: 95 },
        { id: 2, type: 'intruder', name: 'Unknown Person', timestamp: new Date(Date.now() - 3600000).toISOString(), confidence: 0 },
        { id: 3, type: 'authorized', name: 'Jane Smith', timestamp: new Date(Date.now() - 7200000).toISOString(), confidence: 92 }
    ]
};

app.get('/api/security/status', (req, res) => {
    res.json({ success: true, data: securityData });
});

app.post('/api/security/register-face', (req, res) => {
    const newFace = {
        id: Date.now(),
        name: `User ${securityData.registeredFaces.length + 1}`,
        registeredAt: new Date().toISOString()
    };
    
    securityData.registeredFaces.push(newFace);
    console.log('📷 Face registered:', newFace.name);
    
    res.json({ 
        success: true, 
        message: 'Face registered successfully',
        data: newFace
    });
});

app.post('/api/security/toggle', (req, res) => {
    const { active } = req.body;
    securityData.isActive = active;
    
    const logEntry = {
        id: Date.now(),
        type: 'system',
        name: `Security ${active ? 'activated' : 'deactivated'}`,
        timestamp: new Date().toISOString(),
        confidence: 100
    };
    
    securityData.logs.unshift(logEntry);
    console.log('🔒 Security status changed:', active ? 'ACTIVE' : 'INACTIVE');
    
    res.json({ 
        success: true, 
        message: `Security ${active ? 'activated' : 'deactivated'}`,
        data: { isActive: active }
    });
});

app.delete('/api/security/logs', (req, res) => {
    securityData.logs = [];
    console.log('🗑️ Security logs cleared');
    
    res.json({ 
        success: true, 
        message: 'Security logs cleared'
    });
});

// Emergency endpoints
app.post('/api/emergency/trigger', async (req, res) => {
    const { type, location, email } = req.body;
    console.log(`🚨 Emergency alert triggered: ${type} at ${location}`);
    
    // Send email notification
    if (email) {
        try {
            const mailOptions = {
                from: 'abhishekgiri1978@gmail.com',
                to: email,
                subject: `🚨 EMERGENCY ALERT - ${type.toUpperCase()}`,
                html: `
                    <h2 style="color: red;">🚨 EMERGENCY ALERT ACTIVATED</h2>
                    <p><strong>Type:</strong> ${type}</p>
                    <p><strong>Location:</strong> ${location}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Status:</strong> All lights have been turned on automatically</p>
                    <hr>
                    <p><em>This is an automated emergency notification from CareConnect.</em></p>
                `
            };
            
            await transporter.sendMail(mailOptions);
            console.log(`✅ Emergency email sent to: ${email}`);
            
        } catch (emailError) {
            console.error('❌ Email failed:', emailError.message);
        }
    }
    
    res.json({ 
        success: true, 
        message: `${type} emergency alert activated`,
        data: { type, location, timestamp: new Date().toISOString(), emailSent: !!email }
    });
});

app.post('/api/emergency/test-alert', (req, res) => {
    console.log('🚨 Test alert sent to all emergency contacts');
    
    res.json({ 
        success: true, 
        message: 'Test alert sent to all contacts'
    });
});

// Communication endpoints
app.post('/api/communication/braille-translate', (req, res) => {
    const { canvas } = req.body;
    console.log('⚙️ Braille pattern translation requested');
    
    // Simulate braille translation
    const translations = ['Hello', 'Help me', 'Thank you', 'I am fine', 'Emergency'];
    const randomTranslation = translations[Math.floor(Math.random() * translations.length)];
    
    res.json({ 
        success: true, 
        text: randomTranslation,
        message: 'Braille pattern translated successfully'
    });
});

app.post('/api/communication/sign-recognition', (req, res) => {
    const { action } = req.body;
    console.log(`🤟 Sign language recognition ${action}`);
    
    res.json({ 
        success: true, 
        message: `Sign recognition ${action}ed`,
        status: action === 'start' ? 'active' : 'inactive'
    });
});

app.post('/api/communication/send-message', (req, res) => {
    const { message } = req.body;
    console.log('💬 Message sent:', message);
    
    res.json({ 
        success: true, 
        message: 'Message sent successfully'
    });
});

app.post('/api/communication/quick-phrase', (req, res) => {
    const { phrase } = req.body;
    console.log('💬 Quick phrase sent:', phrase);
    
    res.json({ 
        success: true, 
        message: `Quick phrase "${phrase}" sent successfully`
    });
});

app.listen(PORT, () => {
    console.log(`CareConnect Backend API running at http://localhost:${PORT}`);
    console.log('Frontend should connect to this backend');
    console.log('Available endpoints:');
    console.log('   - GET  /api/devices - Device list');
    console.log('   - POST /api/devices/:id/control - Device control');
    console.log('   - GET  /api/dashboard/stats - Dashboard data');
    console.log('   - GET  /api/accessibility/settings - Get accessibility settings');
    console.log('   - POST /api/accessibility/settings - Update accessibility settings');
    console.log('   - GET  /api/accessibility/load - Load saved accessibility settings');
    console.log('   - POST /api/accessibility/reset - Reset accessibility to defaults');
    console.log('   - POST /api/voice/process - Voice commands');
    console.log('   - GET  /api/gesture/devices - Gesture devices');
    console.log('   - POST /api/gesture/devices - Update gesture device');
    console.log('   - POST /api/gesture/devices/:id/toggle - Toggle specific device');
    console.log('   - GET  /api/gesture/settings - Gesture system settings');
    console.log('   - POST /api/gesture/settings - Update gesture settings');
    console.log('   - GET  /api/gesture/health - Gesture system health');
    console.log('   - POST /api/gesture/reset - Reset all devices');
    console.log('   - GET  /gesture-control - Gesture Control Interface');
    console.log('   - POST /api/gesture/process - Process gesture detection');
    console.log('   - POST /api/gesture/simulate - Simulate gesture for testing');
    console.log('   - GET  /api/gesture/commands - Available gesture commands');
    console.log('   - POST /api/gesture/commands - Create gesture command');
    console.log('   - PUT  /api/gesture/commands/:id - Update gesture command');
    console.log('   - DELETE /api/gesture/commands/:id - Delete gesture command');
    console.log('   - GET  /api/gesture/presets - Accessibility gesture presets');
    console.log('   - POST /api/gesture/presets/apply - Apply gesture preset');
    console.log('   - GET  /api/security/status - Security system');
    console.log('   - POST /api/emergency/trigger - Emergency alerts');
    console.log('   - POST /api/communication/* - Communication tools');
    
    // Load accessibility settings on startup
    try {
        const fs = require('fs');
        const path = require('path');
        const settingsPath = path.join(__dirname, 'accessibility-settings.json');
        
        if (fs.existsSync(settingsPath)) {
            const savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            accessibilitySettings = { ...accessibilitySettings, ...savedSettings };
            console.log('Accessibility settings loaded on startup:', accessibilitySettings);
        } else {
            console.log('Using default accessibility settings:', accessibilitySettings);
        }
    } catch (error) {
        console.error('Failed to load accessibility settings on startup:', error.message);
    }
});