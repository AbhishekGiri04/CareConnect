#!/usr/bin/env node

/**
 * CareConnect Gesture Control System Startup Script
 * Starts the backend server and opens the gesture control interface
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting CareConnect Gesture Control System...');

// Check if required files exist
const requiredFiles = [
    './backend/server.js',
    './backend/views/gesture-control.html',
    './backend/gesture-mediapipe.js'
];

console.log('📋 Checking required files...');
for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ Required file missing: ${file}`);
        process.exit(1);
    }
}
console.log('✅ All required files found');

// Start backend server
console.log('🔧 Starting CareConnect Backend Server...');
const backendProcess = spawn('node', ['backend/server.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

backendProcess.on('error', (error) => {
    console.error('❌ Failed to start backend server:', error);
    process.exit(1);
});

// Wait for server to start
setTimeout(() => {
    console.log('🌐 Backend server should be running at http://localhost:3001');
    console.log('👋 Gesture Control Interface: http://localhost:3001/gesture-control');
    console.log('📊 API Health Check: http://localhost:3001/api/gesture/health');
    console.log('');
    console.log('🎯 Quick Start Guide:');
    console.log('   1. Open http://localhost:3001/gesture-control in your browser');
    console.log('   2. Click "Enable" to activate gesture control');
    console.log('   3. Click "Start Camera" to begin detection');
    console.log('   4. Show 1-4 fingers to control LEDs:');
    console.log('      • 1 finger = Living Room LED');
    console.log('      • 2 fingers = Bedroom LED');
    console.log('      • 3 fingers = Kitchen LED');
    console.log('      • 4 fingers = Bathroom LED');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   • Ensure camera permissions are granted');
    console.log('   • Check browser console for MediaPipe errors');
    console.log('   • Test with simulation buttons first');
    console.log('');
    console.log('Press Ctrl+C to stop the system');
}, 2000);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down CareConnect Gesture Control System...');
    
    if (backendProcess) {
        backendProcess.kill('SIGINT');
    }
    
    setTimeout(() => {
        console.log('✅ System shutdown complete');
        process.exit(0);
    }, 1000);
});

// Keep the process running
process.stdin.resume();