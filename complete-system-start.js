#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏠 CareConnect + SmartAssist - Complete System Startup');
console.log('=====================================================\n');

const careConnectPath = path.join(__dirname, 'home-automation-firebase-iot-main');
const smartAssistPath = path.join(__dirname, 'SmartAssist Home — IoT for Accessibility');

// Check if both projects exist
function checkProjects() {
    const careConnectExists = fs.existsSync(careConnectPath);
    const smartAssistExists = fs.existsSync(smartAssistPath);
    
    if (!careConnectExists) {
        console.log('❌ CareConnect project not found at:', careConnectPath);
        return false;
    }
    
    if (!smartAssistExists) {
        console.log('❌ SmartAssist project not found at:', smartAssistPath);
        return false;
    }
    
    return true;
}

// Install dependencies for all projects
function installDependencies() {
    return new Promise((resolve, reject) => {
        console.log('📦 Installing dependencies for all projects...\n');
        
        // Install CareConnect dependencies
        console.log('Installing CareConnect dependencies...');
        const careConnectInstall = spawn('npm', ['install'], { 
            stdio: 'inherit', 
            cwd: careConnectPath 
        });
        
        careConnectInstall.on('close', (code) => {
            if (code === 0) {
                // Install CareConnect backend dependencies
                const careBackendInstall = spawn('npm', ['install'], { 
                    stdio: 'inherit', 
                    cwd: path.join(careConnectPath, 'backend') 
                });
                
                careBackendInstall.on('close', (backendCode) => {
                    if (backendCode === 0) {
                        // Install CareConnect frontend dependencies
                        const careFrontendInstall = spawn('npm', ['install'], { 
                            stdio: 'inherit', 
                            cwd: path.join(careConnectPath, 'frontend') 
                        });
                        
                        careFrontendInstall.on('close', (frontendCode) => {
                            if (frontendCode === 0) {
                                // Install SmartAssist dependencies
                                console.log('Installing SmartAssist dependencies...');
                                const smartAssistInstall = spawn('npm', ['install'], { 
                                    stdio: 'inherit', 
                                    cwd: smartAssistPath 
                                });
                                
                                smartAssistInstall.on('close', (smartCode) => {
                                    if (smartCode === 0) {
                                        // Install SmartAssist backend dependencies
                                        const smartBackendInstall = spawn('npm', ['install'], { 
                                            stdio: 'inherit', 
                                            cwd: path.join(smartAssistPath, 'backend') 
                                        });
                                        
                                        smartBackendInstall.on('close', (smartBackendCode) => {
                                            if (smartBackendCode === 0) {
                                                resolve();
                                            } else {
                                                reject('SmartAssist backend dependencies failed');
                                            }
                                        });
                                    } else {
                                        reject('SmartAssist dependencies failed');
                                    }
                                });
                            } else {
                                reject('CareConnect frontend dependencies failed');
                            }
                        });
                    } else {
                        reject('CareConnect backend dependencies failed');
                    }
                });
            } else {
                reject('CareConnect dependencies failed');
            }
        });
    });
}

// Start SmartAssist backend (port 5004)
function startSmartAssistBackend() {
    console.log('🔧 Starting SmartAssist Backend (Port 5004)...');
    const smartBackend = spawn('npm', ['start'], { 
        stdio: ['inherit', 'pipe', 'pipe'], 
        cwd: path.join(smartAssistPath, 'backend')
    });
    
    smartBackend.stdout.on('data', (data) => {
        console.log(`[SMARTASSIST] ${data.toString().trim()}`);
    });
    
    smartBackend.stderr.on('data', (data) => {
        console.log(`[SMARTASSIST] ${data.toString().trim()}`);
    });
    
    return smartBackend;
}

// Start CareConnect backend (port 3001)
function startCareConnectBackend() {
    console.log('🔧 Starting CareConnect Backend (Port 3001)...');
    const careBackend = spawn('npm', ['start'], { 
        stdio: ['inherit', 'pipe', 'pipe'], 
        cwd: path.join(careConnectPath, 'backend')
    });
    
    careBackend.stdout.on('data', (data) => {
        console.log(`[CARECONNECT-API] ${data.toString().trim()}`);
    });
    
    careBackend.stderr.on('data', (data) => {
        console.log(`[CARECONNECT-API] ${data.toString().trim()}`);
    });
    
    return careBackend;
}

// Start CareConnect frontend (port 3002)
function startCareConnectFrontend() {
    console.log('📱 Starting CareConnect Frontend (Port 3002)...');
    const careFrontend = spawn('npm', ['start'], { 
        stdio: ['inherit', 'pipe', 'pipe'], 
        cwd: path.join(careConnectPath, 'frontend'),
        env: { ...process.env, PORT: '3002' }
    });
    
    careFrontend.stdout.on('data', (data) => {
        console.log(`[CARECONNECT-UI] ${data.toString().trim()}`);
    });
    
    careFrontend.stderr.on('data', (data) => {
        console.log(`[CARECONNECT-UI] ${data.toString().trim()}`);
    });
    
    return careFrontend;
}

// Main execution
async function main() {
    try {
        // Check if projects exist
        if (!checkProjects()) {
            console.log('\n💡 Make sure both projects are in the correct directories:');
            console.log('   • CareConnect: home-automation-firebase-iot-main/');
            console.log('   • SmartAssist: SmartAssist Home — IoT for Accessibility/');
            process.exit(1);
        }

        console.log('✅ Both projects found\n');

        // Install dependencies
        console.log('⚠️ Installing dependencies (this may take a few minutes)...');
        await installDependencies();
        console.log('✅ All dependencies installed successfully!\n');

        // Start all services
        console.log('🚀 Starting all services...\n');
        
        // Start SmartAssist backend first (port 5004)
        const smartBackend = startSmartAssistBackend();
        
        // Wait 3 seconds then start CareConnect backend (port 3001)
        setTimeout(() => {
            const careBackend = startCareConnectBackend();
            
            // Wait 3 more seconds then start CareConnect frontend (port 3002)
            setTimeout(() => {
                const careFrontend = startCareConnectFrontend();
                
                // Show access information after 8 seconds
                setTimeout(() => {
                    console.log('\n🚀 Complete CareConnect + SmartAssist System Ready!');
                    console.log('=========================================================');
                    console.log('📱 CareConnect Frontend: http://localhost:3002');
                    console.log('🔧 CareConnect Backend: http://localhost:3001');
                    console.log('⚡ SmartAssist Backend: http://localhost:5004');
                    console.log('🏠 Advanced Controller: http://localhost:3002/controller');
                    console.log('\n🔐 Login Options:');
                    console.log('   • Google Sign-In (Recommended)');
                    console.log('   • Demo Account: demo@careconnect.com / demo123');
                    console.log('\n💡 Features Available:');
                    console.log('   • Real-time Device Control (Connected to SmartAssist)');
                    console.log('   • Voice Control & Gesture Recognition');
                    console.log('   • Health & Safety Monitoring');
                    console.log('   • Emergency Alert System');
                    console.log('   • Backend Data Integration');
                    console.log('\n🔗 System Architecture:');
                    console.log('   Frontend (3002) → CareConnect API (3001) → SmartAssist Backend (5004)');
                    console.log('\n⚡ Press Ctrl+C to stop all services\n');
                }, 8000);
                
                // Handle process termination
                process.on('SIGINT', () => {
                    console.log('\n🛑 Shutting down complete system...');
                    smartBackend.kill('SIGINT');
                    careBackend.kill('SIGINT');
                    careFrontend.kill('SIGINT');
                    process.exit(0);
                });
                
            }, 3000);
        }, 3000);

    } catch (error) {
        console.error('❌ Error:', error);
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Make sure Node.js is installed');
        console.log('   2. Make sure MongoDB is running (for SmartAssist)');
        console.log('   3. Check if ports 3001, 3002, and 5004 are free');
        console.log('   4. Run: npm install in each project directory');
        process.exit(1);
    }
}

main();