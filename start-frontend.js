#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting CareConnect Frontend with Firebase Integration...\n');

// Start React frontend
const frontendProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

frontendProcess.on('error', (error) => {
  console.error('❌ Frontend Error:', error);
});

frontendProcess.on('close', (code) => {
  console.log(`\n🔴 Frontend process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  frontendProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  frontendProcess.kill('SIGTERM');
  process.exit(0);
});

// Auto-open Chrome after 5 seconds
setTimeout(() => {
  const { exec } = require('child_process');
  exec('open -a "Google Chrome" http://localhost:3000', (error) => {
    if (error) {
      exec('start chrome http://localhost:3000', (error2) => {
        if (error2) console.log('Please open http://localhost:3000 manually');
      });
    }
  });
}, 5000);

console.log('✅ Frontend starting on http://localhost:3000');
console.log('✅ Firebase integration enabled');
console.log('✅ Voice control available');
console.log('✅ Real-time device control active');
console.log('🌐 Chrome will auto-open in 5 seconds...');
console.log('\n📝 Note: Make sure your ESP32 devices are connected to Firebase!');