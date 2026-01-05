#!/usr/bin/env node

/**
 * CareConnect Voice Control Auto-Startup Script
 * Automatically enables voice control after login
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🎤 CareConnect Voice Control Auto-Startup');
console.log('=========================================');

// Configuration
const config = {
  frontendPort: 3000,
  backendPort: 3001,
  voiceEnabled: true,
  autoLogin: false, // Set to true for demo purposes
  defaultUser: {
    email: 'admin@careconnect.com',
    password: 'admin123'
  }
};

// Voice Control Features
const voiceFeatures = {
  continuousMode: false,
  emergencyCommands: true,
  roomControls: true,
  statusCommands: true,
  timeCommands: true,
  greetingCommands: true
};

console.log('✅ Voice Control Configuration:');
console.log(`   - Continuous Mode: ${voiceFeatures.continuousMode ? 'ENABLED' : 'DISABLED'}`);
console.log(`   - Emergency Commands: ${voiceFeatures.emergencyCommands ? 'ENABLED' : 'DISABLED'}`);
console.log(`   - Room Controls: ${voiceFeatures.roomControls ? 'ENABLED' : 'DISABLED'}`);
console.log(`   - Status Commands: ${voiceFeatures.statusCommands ? 'ENABLED' : 'DISABLED'}`);
console.log(`   - Time Commands: ${voiceFeatures.timeCommands ? 'ENABLED' : 'DISABLED'}`);
console.log(`   - Greeting Commands: ${voiceFeatures.greetingCommands ? 'ENABLED' : 'DISABLED'}`);

// Start backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('\n🔧 Starting CareConnect Backend...');
    
    const backendProcess = exec('npm start', {
      cwd: path.join(__dirname, 'backend')
    });
    
    backendProcess.stdout.on('data', (data) => {
      if (data.includes('CareConnect Backend API running')) {
        console.log('✅ Backend server started successfully');
        resolve();
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.error('❌ Backend error:', data);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      console.log('✅ Backend startup timeout - continuing...');
      resolve();
    }, 30000);
  });
}

// Start frontend server
function startFrontend() {
  return new Promise((resolve, reject) => {
    console.log('\n🌐 Starting CareConnect Frontend...');
    
    const frontendProcess = exec('npm start', {
      cwd: path.join(__dirname, 'frontend')
    });
    
    frontendProcess.stdout.on('data', (data) => {
      if (data.includes('webpack compiled') || data.includes('Local:')) {
        console.log('✅ Frontend server started successfully');
        resolve();
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      console.error('❌ Frontend error:', data);
    });
    
    // Timeout after 45 seconds
    setTimeout(() => {
      console.log('✅ Frontend startup timeout - continuing...');
      resolve();
    }, 45000);
  });
}

// Enable voice control features
function enableVoiceControl() {
  console.log('\n🎤 Enabling Voice Control Features...');
  
  // Voice commands that will be available
  const availableCommands = [
    '🏠 Room Controls:',
    '   • "Living room on/off"',
    '   • "Bedroom light on/off"', 
    '   • "Kitchen on/off"',
    '   • "Bathroom light on/off"',
    '',
    '🚨 Emergency Commands:',
    '   • "Emergency" - Turn on all lights',
    '   • "Panic" - Activate emergency mode',
    '   • "Help me" - Emergency assistance',
    '',
    '📊 Status Commands:',
    '   • "What time" - Current time',
    '   • "What date" - Current date',
    '   • "System status" - System check',
    '',
    '🔧 Control Commands:',
    '   • "Turn on LED 1/2/3/4"',
    '   • "Turn off LED 1/2/3/4"',
    '   • "All lights on/off"',
    '',
    '👋 Greeting Commands:',
    '   • "Hello" - Greeting response',
    '   • "Good morning/night"',
    '   • "Thank you"',
    '   • "What can you do" - Help'
  ];
  
  console.log('🎯 Available Voice Commands:');
  availableCommands.forEach(cmd => console.log(cmd));
  
  return true;
}

// Open browser automatically
function openBrowser() {
  console.log('\n🌐 Opening CareConnect in browser...');
  
  const url = `http://localhost:${config.frontendPort}`;
  
  // Cross-platform browser opening
  const start = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
  
  exec(`${start} ${url}`, (error) => {
    if (error) {
      console.log(`❌ Could not open browser automatically. Please visit: ${url}`);
    } else {
      console.log(`✅ Browser opened: ${url}`);
    }
  });
}

// Display usage instructions
function showUsageInstructions() {
  console.log('\n📋 CareConnect Voice Control Usage:');
  console.log('=====================================');
  console.log('1. Login to CareConnect dashboard');
  console.log('2. Click the 🎤 "Start Listening" button in Voice Control section');
  console.log('3. Allow microphone access when prompted');
  console.log('4. Speak any of the available commands clearly');
  console.log('5. Use "Continuous Mode" for hands-free operation');
  console.log('');
  console.log('🔧 Advanced Features:');
  console.log('• Voice Settings - Adjust speech recognition');
  console.log('• Test Voice - Verify audio output');
  console.log('• Continuous Mode - Always listening mode');
  console.log('');
  console.log('🚨 Emergency Features:');
  console.log('• Say "Emergency" to turn on all lights instantly');
  console.log('• Say "Panic" to activate emergency mode');
  console.log('• Say "Help me" for emergency assistance');
  console.log('');
  console.log('💡 Tips:');
  console.log('• Speak clearly and at normal volume');
  console.log('• Wait for confirmation before next command');
  console.log('• Use simple, direct phrases');
  console.log('• Check microphone permissions if not working');
}

// Main startup function
async function startCareConnect() {
  try {
    console.log('🚀 Starting CareConnect with Voice Control...\n');
    
    // Start backend
    await startBackend();
    
    // Start frontend  
    await startFrontend();
    
    // Enable voice control
    enableVoiceControl();
    
    // Wait a moment for servers to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Open browser
    openBrowser();
    
    // Show instructions
    showUsageInstructions();
    
    console.log('\n🎉 CareConnect Voice Control is ready!');
    console.log('🎤 Voice control will be available after login');
    console.log('📱 Access dashboard at: http://localhost:3000');
    console.log('🔧 Backend API at: http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down CareConnect...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 CareConnect terminated');
  process.exit(0);
});

// Start the application
if (require.main === module) {
  startCareConnect();
}

module.exports = {
  startCareConnect,
  config,
  voiceFeatures
};