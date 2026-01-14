#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironment() {
    log('🔍 Checking environment configuration...', 'cyan');
    
    const requiredFiles = [
        'backend/.env',
        'frontend/.env',
        'backend/package.json',
        'frontend/package.json'
    ];
    
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
        log('❌ Missing required files:', 'red');
        missingFiles.forEach(file => log(`   • ${file}`, 'red'));
        return false;
    }
    
    log('✅ Environment check passed', 'green');
    return true;
}

function checkDependencies() {
    log('📦 Checking dependencies...', 'cyan');
    
    const directories = ['backend', 'frontend'];
    
    for (const dir of directories) {
        const nodeModulesPath = path.join(dir, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            log(`❌ Dependencies not installed in ${dir}`, 'red');
            log(`   Run: cd ${dir} && npm install`, 'yellow');
            return false;
        }
    }
    
    log('✅ Dependencies check passed', 'green');
    return true;
}

function startServices() {
    log('🚀 Starting CareConnect services...', 'magenta');
    
    // Start backend
    log('🔧 Starting backend server (Port 3001)...', 'blue');
    const backend = spawn('npm', ['start'], {
        cwd: 'backend',
        stdio: 'inherit',
        shell: true
    });
    
    // Wait a moment then start frontend
    setTimeout(() => {
        log('🎨 Starting frontend application (Port 3000)...', 'blue');
        const frontend = spawn('npm', ['start'], {
            cwd: 'frontend',
            stdio: 'inherit',
            shell: true
        });
        
        frontend.on('error', (err) => {
            log(`❌ Frontend error: ${err.message}`, 'red');
        });
    }, 3000);
    
    backend.on('error', (err) => {
        log(`❌ Backend error: ${err.message}`, 'red');
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        log('\n🛑 Shutting down CareConnect...', 'yellow');
        backend.kill('SIGINT');
        process.exit(0);
    });
    
    log('\n🌐 CareConnect is starting up...', 'green');
    log('   Frontend: http://localhost:3000', 'cyan');
    log('   Backend:  http://localhost:3001', 'cyan');
    log('   Press Ctrl+C to stop all services\n', 'yellow');
}

function main() {
    log('🏥 CareConnect - Integrated Accessibility Platform', 'magenta');
    log('='.repeat(50), 'cyan');
    
    if (!checkEnvironment()) {
        log('❌ Environment check failed. Please fix the issues above.', 'red');
        process.exit(1);
    }
    
    if (!checkDependencies()) {
        log('❌ Dependencies check failed. Please install dependencies.', 'red');
        log('   Run: npm run setup', 'yellow');
        process.exit(1);
    }
    
    startServices();
}

if (require.main === module) {
    main();
}

module.exports = { checkEnvironment, checkDependencies, startServices };