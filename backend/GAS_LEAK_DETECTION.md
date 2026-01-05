# Gas Leak Detection System

## Overview

The smart home system includes **PIR sensor-based gas leak detection** that monitors for gas leaks and provides immediate alerts through the web application.

## Hardware Setup

### ESP32 Connections
- **PIR Sensor Pin**: GPIO 13
- **Power**: 3.3V or 5V
- **Ground**: GND

### PIR Sensor Configuration
- Connect PIR sensor output to GPIO 13
- Sensor detects gas presence and sends HIGH signal
- ESP32 monitors sensor and updates Firebase

## Alert System Features

### 🚨 Immediate Alerts
- **Full-screen red alert** overlay
- **Pulsing animation** for attention
- **Shaking warning text** effect
- **Audio beep alerts** (800Hz/600Hz pattern)
- **Browser notifications** (if permission granted)
- **Device vibration** (mobile devices)

### 📊 Safety Status Display
- **Real-time status indicator**
- **SAFE** (green) - No gas detected
- **DANGER - GAS LEAK!** (red, blinking) - Gas detected
- **Persistent status** until sensor clears

### 🔔 Alert Management
- **Acknowledge button** to dismiss overlay
- **Status remains visible** until cleared
- **Automatic sound stopping** when acknowledged
- **Re-alert** if gas leak persists

## Firebase Integration

### Data Structure
```json
{
  "LED1": 0,
  "LED2": 0,
  "LED3": 0,
  "LED4": 0,
  "GAS_LEAK": 0  // 0 = Safe, 1 = Gas Detected
}
```

### Real-time Updates
- PIR sensor → ESP32 → Firebase → Web App
- Instant alert triggering (< 1 second)
- Automatic status clearing when safe

## Safety Protocols

### When Gas Leak Detected:
1. **Immediate visual/audio alerts**
2. **Browser notification sent**
3. **Status indicator turns red**
4. **Continuous monitoring until cleared**

### When Gas Leak Cleared:
1. **Alert overlay disappears**
2. **Status returns to SAFE (green)**
3. **Audio alerts stop automatically**
4. **System ready for next detection**

## Browser Requirements

- **Modern browser** (Chrome, Firefox, Safari, Edge)
- **Notification permission** (optional but recommended)
- **Audio support** for alert sounds
- **Vibration API** support (mobile devices)

## Testing

### Manual Testing
1. Trigger PIR sensor (simulate gas leak)
2. Verify immediate web app alert
3. Check Firebase data update
4. Test acknowledge functionality
5. Verify status clearing when sensor resets

### Safety Notes
- **Test regularly** to ensure system functionality
- **Keep sensor clean** and properly positioned
- **Check Firebase connectivity** periodically
- **Ensure web app notifications** are enabled