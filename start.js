#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting CareConnect System...\n');

// Start backend
const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Start frontend after 3 seconds
setTimeout(() => {
  const frontend = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit', 
    shell: true,
    env: { ...process.env, PORT: '3002', BROWSER: 'none' }
  });
}, 3000);

// Auto-open single Chrome tab after 8 seconds
setTimeout(() => {
  exec('open -n -a "Google Chrome" --args --new-window http://localhost:3002', (error) => {
    if (error) {
      exec('start chrome --new-window http://localhost:3002', (error2) => {
        if (error2) console.log('Please open http://localhost:3002 manually');
      });
    }
  });
}, 8000);

console.log('✅ Backend: http://localhost:3001');
console.log('✅ Frontend: http://localhost:3002');
console.log('🌐 Single Chrome tab will open in 8 seconds...');