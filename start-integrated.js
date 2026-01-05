#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting CareConnect Integrated System...');
console.log('🔧 Backend: http://localhost:3001');
console.log('📱 CareMe: http://localhost:3002/devices');
console.log('⚡ Frontend: http://localhost:3000');
console.log('');

// Start CareConnect Backend
console.log('🔧 Starting CareConnect Backend...');
const backend = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit'
});

// Start CareMe System
setTimeout(() => {
    console.log('📱 Starting CareMe System...');
    const carme = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..', 'Care', 'nodejs-version'),
        stdio: 'inherit'
    });
}, 2000);

// Start Frontend
setTimeout(() => {
    console.log('⚡ Starting React Frontend...');
    const frontend = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'frontend'),
        stdio: 'inherit'
    });
}, 4000);

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down integrated system...');
    process.exit(0);
});

console.log('✅ All systems starting...');
console.log('📋 Access Points:');
console.log('   • CareConnect Backend: http://localhost:3001');
console.log('   • CareMe Device Control: http://localhost:3002/devices');
console.log('   • React Frontend: http://localhost:3000');