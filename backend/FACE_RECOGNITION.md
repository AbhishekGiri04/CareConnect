# Face Recognition Security System

## Overview

Advanced face recognition security system that registers one authorized user and detects/logs any unauthorized faces with timestamps. All data is stored locally for privacy.

## Features

### 🔐 Face Registration
- **One-time setup** - Register authorized user's face
- **Single face detection** - Ensures only one person registers
- **Local storage** - Face data stored in browser localStorage
- **Visual confirmation** - Green checkmark when registered

### 🔍 Security Monitoring
- **Real-time face detection** using TensorFlow.js BlazeFace
- **Authorized vs Unauthorized** face classification
- **Visual indicators** - Green boxes for authorized, red for intruders
- **Multiple face detection** - Handles multiple people in frame
- **3-second cooldown** - Prevents spam logging

### 📊 Security Logging
- **Timestamp recording** - Exact time of detection
- **Intruder count** - Number of unauthorized faces
- **Total face count** - All faces detected in frame
- **Local storage** - Logs stored in browser localStorage
- **Persistent logs** - Survives browser refresh

### 🚨 Alert System
- **Visual alerts** - Red warning banner for intruders
- **Auto-hide alerts** - Disappears after 5 seconds
- **Status updates** - Real-time security status
- **Log management** - Clear logs functionality

## How to Use

### Initial Setup
1. Click **📷 Register Face** button
2. Position your face in camera view
3. Wait 3 seconds for capture
4. System confirms registration with ✅

### Security Monitoring
1. Click **🔍 Start Security** button
2. Camera activates and monitors continuously
3. Authorized faces show **green boxes**
4. Unauthorized faces show **red boxes** and trigger alerts
5. Click **🛑 Stop Security** to deactivate

### Viewing Logs
- **Security Logs section** shows all incidents
- **Timestamp** - When unauthorized person was detected
- **Count details** - Number of intruders vs total faces
- **Clear Logs** button to reset history

## Technical Details

### Face Detection
- **TensorFlow.js BlazeFace** model for face detection
- **Bounding box comparison** for face matching
- **30% tolerance** for face size variations
- **Real-time processing** at ~10 FPS

### Data Storage
```javascript
// Registered Face Structure
{
  topLeft: [x, y],
  bottomRight: [x, y], 
  landmarks: [...],
  timestamp: 1234567890
}

// Security Log Structure
{
  timestamp: "12/25/2023, 10:30:45 AM",
  intruderCount: 2,
  totalFaces: 3,
  id: 1234567890
}
```

### Privacy & Security
- **No cloud storage** - All data stays local
- **Browser localStorage** - Data persists locally only
- **No face images stored** - Only mathematical features
- **User control** - Can clear all data anytime

## Browser Requirements

- **Modern browser** with WebRTC support
- **Camera access** permission required
- **TensorFlow.js support** (Chrome, Firefox, Safari, Edge)
- **localStorage** enabled
- **Good lighting** for accurate detection

## Use Cases

- **Home security** - Monitor for intruders
- **Office access** - Authorized personnel only
- **Child safety** - Alert when strangers present
- **Privacy protection** - Know who's been in your space
- **Security audit** - Review access logs

## Limitations

- **Single registered user** - Only one authorized face
- **Lighting dependent** - Needs good illumination
- **Simplified matching** - Basic face comparison algorithm
- **Local storage only** - Data not synced across devices
- **Browser dependent** - Works only in registered browser

## Future Enhancements

- Multiple authorized users
- Advanced face recognition algorithms
- Cloud storage integration
- Mobile app notifications
- Video recording capabilities