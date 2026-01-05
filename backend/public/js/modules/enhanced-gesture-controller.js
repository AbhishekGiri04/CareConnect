/**
 * Enhanced Gesture Controller with MediaPipe Integration
 * Supports 1-4 finger detection for CareConnect LED control
 */
class EnhancedGestureController {
    constructor(options = {}) {
        this.isEnabled = false;
        this.cameraActive = false;
        this.hands = null;
        this.camera = null;
        this.lastGesture = null;
        this.gestureTimeout = null;
        this.detectionCount = 0;
        
        // Configuration
        this.config = {
            apiUrl: options.apiUrl || 'http://localhost:3001/api/gesture',
            sensitivity: options.sensitivity || 0.7,
            detectionRange: options.detectionRange || 'medium',
            responseDelay: options.responseDelay || 0,
            maxHands: 1,
            modelComplexity: 1,
            minTrackingConfidence: 0.5,
            ...options
        };
        
        // Device mapping
        this.devices = {
            1: { name: 'Living Room LED', status: false, emoji: '🛋️' },
            2: { name: 'Bedroom LED', status: false, emoji: '🛏️' },
            3: { name: 'Kitchen LED', status: false, emoji: '🍳' },
            4: { name: 'Bathroom LED', status: false, emoji: '🚿' }
        };
        
        // Gesture statistics
        this.stats = {
            totalGestures: 0,
            successfulGestures: 0,
            lastGestureTime: null,
            averageConfidence: 0
        };
        
        // Callbacks
        this.onGestureDetected = options.onGestureDetected || this.defaultGestureHandler.bind(this);
        this.onStatusChange = options.onStatusChange || this.defaultStatusHandler.bind(this);
        this.onError = options.onError || this.defaultErrorHandler.bind(this);
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Enhanced Gesture Controller...');
        
        try {
            await this.loadDeviceStates();
            await this.checkAPIHealth();
            this.bindEvents();
            this.updateUI();
            
            console.log('✅ Enhanced Gesture Controller initialized successfully');
            this.onStatusChange('initialized', 'Gesture controller ready');
        } catch (error) {
            console.error('❌ Failed to initialize gesture controller:', error);
            this.onError('initialization_failed', error.message);
        }
    }
    
    async checkAPIHealth() {
        try {
            const response = await fetch(`${this.config.apiUrl}/health`);
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Gesture API connected:', data.status);
                return true;
            }
        } catch (error) {
            console.log('⚠️ Gesture API not available, using local mode');
            return false;
        }
    }
    
    async loadDeviceStates() {
        try {
            const response = await fetch(`${this.config.apiUrl}/devices`);
            const data = await response.json();
            
            if (data.success && data.devices) {
                Object.keys(data.devices).forEach(id => {
                    if (this.devices[id]) {
                        this.devices[id].status = data.devices[id].status;
                    }
                });
                console.log('📱 Device states loaded from API');
            }
        } catch (error) {
            console.log('📱 Loading device states from localStorage');
            const saved = localStorage.getItem('gestureDevices');
            if (saved) {
                const savedDevices = JSON.parse(saved);
                Object.keys(savedDevices).forEach(id => {
                    if (this.devices[id]) {
                        this.devices[id].status = savedDevices[id].status;
                    }
                });
            }
        }
    }
    
    bindEvents() {
        // Auto-refresh API health every 30 seconds
        setInterval(() => this.checkAPIHealth(), 30000);
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.cameraActive) {
                console.log('📱 Page hidden, pausing camera');
                this.pauseCamera();
            } else if (!document.hidden && this.isEnabled) {
                console.log('📱 Page visible, resuming camera');
                this.resumeCamera();
            }
        });
    }
    
    async toggleSystem() {
        this.isEnabled = !this.isEnabled;
        
        if (this.isEnabled) {
            console.log('🟢 Enabling gesture control system');
            await this.startSystem();
        } else {
            console.log('🔴 Disabling gesture control system');
            await this.stopSystem();
        }
        
        this.updateUI();
        this.onStatusChange(this.isEnabled ? 'enabled' : 'disabled', 
                          this.isEnabled ? 'Gesture control enabled' : 'Gesture control disabled');
    }
    
    async startSystem() {
        try {
            // Update backend settings
            await fetch(`${this.config.apiUrl}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    enabled: true,
                    sensitivity: this.config.sensitivity,
                    detectionRange: this.config.detectionRange,
                    responseDelay: this.config.responseDelay
                })
            });
            
            if (!this.cameraActive) {
                await this.startCamera();
            }
            
            this.initHandTracking();
        } catch (error) {
            console.error('❌ Failed to start gesture system:', error);
            this.onError('start_failed', error.message);
        }
    }
    
    async stopSystem() {
        try {
            // Update backend settings
            await fetch(`${this.config.apiUrl}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: false })
            });
            
            this.stopHandTracking();
            this.stopCamera();
        } catch (error) {
            console.error('❌ Failed to stop gesture system:', error);
        }
    }
    
    async startCamera() {
        try {
            console.log('📹 Starting camera...');
            
            const video = document.getElementById('video');
            if (!video) {
                throw new Error('Video element not found');
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            video.srcObject = stream;
            await video.play();
            
            this.cameraActive = true;
            console.log('✅ Camera started successfully');
            
            this.onStatusChange('camera_started', 'Camera active - Show hand gestures');
            
            if (this.isEnabled) {
                this.initHandTracking();
            }
            
        } catch (error) {
            console.error('❌ Camera access failed:', error);
            this.onError('camera_failed', 'Camera access denied. Please allow camera permissions.');
            throw error;
        }
    }
    
    stopCamera() {
        console.log('📹 Stopping camera...');
        
        const video = document.getElementById('video');
        if (video && video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
        
        this.cameraActive = false;
        this.stopHandTracking();
        
        this.onStatusChange('camera_stopped', 'Camera stopped');
    }
    
    pauseCamera() {
        if (this.camera) {
            this.camera.stop();
        }
    }
    
    resumeCamera() {
        if (this.cameraActive && this.isEnabled) {
            this.initHandTracking();
        }
    }
    
    initHandTracking() {
        if (!this.cameraActive || !window.Hands) {
            console.log('⚠️ Cannot initialize hand tracking: camera inactive or MediaPipe not loaded');
            return;
        }
        
        console.log('👋 Initializing MediaPipe hand tracking...');
        
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        this.hands.setOptions({
            maxNumHands: this.config.maxHands,
            modelComplexity: this.config.modelComplexity,
            minDetectionConfidence: this.config.sensitivity,
            minTrackingConfidence: this.config.minTrackingConfidence
        });
        
        this.hands.onResults((results) => this.onHandResults(results));
        
        const video = document.getElementById('video');
        if (!video) return;
        
        this.camera = new Camera(video, {
            onFrame: async () => {
                if (this.hands && this.isEnabled) {
                    await this.hands.send({ image: video });
                }
            },
            width: 640,
            height: 480
        });
        
        this.camera.start();
        console.log('✅ Hand tracking initialized');
    }
    
    stopHandTracking() {
        console.log('👋 Stopping hand tracking...');
        
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }
        
        if (this.hands) {
            this.hands.close();
            this.hands = null;
        }
        
        clearTimeout(this.gestureTimeout);
    }
    
    onHandResults(results) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = 640;
        canvas.height = 480;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const fingerCount = this.countFingers(landmarks);
            const confidence = this.calculateConfidence(landmarks);
            
            // Draw hand visualization
            this.drawHand(ctx, landmarks);
            
            // Process gesture with debouncing
            this.processGesture(fingerCount, confidence, landmarks);
            
            // Update detection info
            this.updateDetectionInfo(`Detected: ${fingerCount} finger(s) (${Math.round(confidence * 100)}%)`);
            
        } else {
            this.updateDetectionInfo('No hand detected - Show your hand to the camera');
        }
    }
    
    countFingers(landmarks) {
        const tips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
        const pips = [3, 6, 10, 14, 18]; // PIP joints
        let count = 0;
        
        // Thumb (different logic - check x-coordinate)
        if (landmarks[tips[0]].x > landmarks[pips[0]].x) {
            count++;
        }
        
        // Other fingers (check y-coordinate)
        for (let i = 1; i < 5; i++) {
            if (landmarks[tips[i]].y < landmarks[pips[i]].y) {
                count++;
            }
        }
        
        return Math.min(count, 4); // Limit to 4 for our use case
    }
    
    calculateConfidence(landmarks) {
        // Calculate confidence based on hand stability and visibility
        let confidence = 0.8; // Base confidence
        
        // Check if all key landmarks are visible
        const keyPoints = [0, 4, 8, 12, 16, 20]; // Wrist and fingertips
        const visiblePoints = keyPoints.filter(i => 
            landmarks[i] && landmarks[i].x >= 0 && landmarks[i].x <= 1 &&
            landmarks[i].y >= 0 && landmarks[i].y <= 1
        );
        
        confidence *= (visiblePoints.length / keyPoints.length);
        
        return Math.max(0.1, Math.min(1.0, confidence));
    }
    
    drawHand(ctx, landmarks) {
        // Draw landmarks
        ctx.fillStyle = '#FF0000';
        landmarks.forEach(landmark => {
            ctx.beginPath();
            ctx.arc(landmark.x * 640, landmark.y * 480, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Draw connections
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        
        const connections = [
            [0,1],[1,2],[2,3],[3,4], // Thumb
            [0,5],[5,6],[6,7],[7,8], // Index
            [5,9],[9,10],[10,11],[11,12], // Middle
            [9,13],[13,14],[14,15],[15,16], // Ring
            [13,17],[17,18],[18,19],[19,20], // Pinky
            [0,17] // Palm
        ];
        
        ctx.beginPath();
        connections.forEach(([start, end]) => {
            ctx.moveTo(landmarks[start].x * 640, landmarks[start].y * 480);
            ctx.lineTo(landmarks[end].x * 640, landmarks[end].y * 480);
        });
        ctx.stroke();
    }
    
    processGesture(fingerCount, confidence, landmarks) {
        // Only process valid finger counts with sufficient confidence
        if (fingerCount < 1 || fingerCount > 4 || confidence < this.config.sensitivity) {
            return;
        }
        
        // Debouncing - prevent rapid repeated gestures
        if (this.lastGesture === fingerCount) {
            return;
        }
        
        clearTimeout(this.gestureTimeout);
        
        this.gestureTimeout = setTimeout(() => {
            this.executeGesture(fingerCount, confidence, landmarks);
            this.lastGesture = fingerCount;
            
            // Reset gesture after delay
            setTimeout(() => {
                this.lastGesture = null;
            }, 1500);
            
        }, this.config.responseDelay);
    }
    
    async executeGesture(fingerCount, confidence, landmarks) {
        console.log(`👋 Executing ${fingerCount} finger gesture (confidence: ${Math.round(confidence * 100)}%)`);
        
        try {
            // Update statistics
            this.stats.totalGestures++;
            this.stats.lastGestureTime = Date.now();
            this.stats.averageConfidence = (this.stats.averageConfidence + confidence) / 2;
            
            // Send to backend API
            const response = await fetch(`${this.config.apiUrl}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gestureType: `${fingerCount} finger(s)`,
                    fingerCount: fingerCount,
                    confidence: confidence,
                    landmarks: landmarks,
                    timestamp: Date.now()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.stats.successfulGestures++;
                
                // Update local device state
                if (result.device) {
                    this.devices[fingerCount] = {
                        ...this.devices[fingerCount],
                        status: result.device.status
                    };
                }
                
                // Trigger callbacks
                this.onGestureDetected(fingerCount, result, confidence);
                
                // Voice feedback
                if (result.voiceMessage) {
                    this.speak(result.voiceMessage);
                }
                
                // Update UI
                this.updateDeviceUI(fingerCount);
                
                console.log(`✅ Gesture executed: ${result.message}`);
                
            } else {
                console.log(`⚠️ Gesture not processed: ${result.message}`);
            }
            
        } catch (error) {
            console.error('❌ Failed to execute gesture:', error);
            this.onError('gesture_failed', error.message);
            
            // Fallback to local processing
            this.executeLocalGesture(fingerCount);
        }
    }
    
    executeLocalGesture(fingerCount) {
        console.log(`📱 Executing gesture locally: ${fingerCount} finger(s)`);
        
        if (this.devices[fingerCount]) {
            this.devices[fingerCount].status = !this.devices[fingerCount].status;
            
            const device = this.devices[fingerCount];
            const message = `${device.name} ${device.status ? 'turned on' : 'turned off'}`;
            
            // Save to localStorage
            localStorage.setItem('gestureDevices', JSON.stringify(this.devices));
            
            // Trigger callbacks
            this.onGestureDetected(fingerCount, { 
                success: true, 
                message, 
                device,
                local: true 
            });
            
            // Voice feedback
            this.speak(message);
            
            // Update UI
            this.updateDeviceUI(fingerCount);
            
            console.log(`✅ Local gesture: ${message}`);
        }
    }
    
    async simulateGesture(fingerCount) {
        console.log(`🧪 Simulating ${fingerCount} finger gesture`);
        
        try {
            const response = await fetch(`${this.config.apiUrl}/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fingerCount: fingerCount,
                    gestureType: `${fingerCount} finger(s)`,
                    confidence: 0.95,
                    timestamp: Date.now()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update local state
                if (result.device) {
                    this.devices[fingerCount] = {
                        ...this.devices[fingerCount],
                        status: result.device.status
                    };
                }
                
                this.onGestureDetected(fingerCount, result, 0.95);
                this.updateDeviceUI(fingerCount);
                
                if (result.voiceMessage) {
                    this.speak(result.voiceMessage);
                }
                
                this.updateDetectionInfo(`Simulated: ${fingerCount} finger(s) - ${result.message}`);
            }
            
        } catch (error) {
            console.error('❌ Failed to simulate gesture:', error);
            this.executeLocalGesture(fingerCount);
        }
    }
    
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.2;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            speechSynthesis.speak(utterance);
        }
    }
    
    updateDetectionInfo(message) {
        const element = document.getElementById('detection-info');
        if (element) {
            element.textContent = message;
        }
    }
    
    updateDeviceUI(deviceId) {
        const deviceCard = document.querySelector(`[data-device="${deviceId}"]`);
        if (!deviceCard) return;
        
        const statusElement = deviceCard.querySelector('.device-status');
        if (!statusElement) return;
        
        const device = this.devices[deviceId];
        if (device.status) {
            statusElement.textContent = 'ON';
            statusElement.className = 'device-status on';
        } else {
            statusElement.textContent = 'OFF';
            statusElement.className = 'device-status off';
        }
    }
    
    updateUI() {
        // Update enable/disable button
        const enableBtn = document.getElementById('enable-btn');
        if (enableBtn) {
            enableBtn.textContent = this.isEnabled ? 'Disable' : 'Enable';
            enableBtn.classList.toggle('active', this.isEnabled);
        }
        
        // Update status text
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = this.isEnabled ? 'Enabled' : 'Disabled';
        }
        
        // Update system status
        const systemStatus = document.getElementById('system-status');
        if (systemStatus) {
            systemStatus.textContent = this.isEnabled ? '🟢' : '🔴';
            systemStatus.className = `status-dot ${this.isEnabled ? 'green' : 'red'}`;
        }
        
        // Update camera button
        const cameraBtn = document.getElementById('start-camera');
        if (cameraBtn) {
            cameraBtn.textContent = this.cameraActive ? '⏹️ Stop Camera' : '▶️ Start Camera';
        }
        
        // Update all device UIs
        Object.keys(this.devices).forEach(deviceId => {
            this.updateDeviceUI(deviceId);
        });
    }
    
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalGestures > 0 ? 
                (this.stats.successfulGestures / this.stats.totalGestures * 100).toFixed(1) : 0,
            isEnabled: this.isEnabled,
            cameraActive: this.cameraActive,
            devices: this.devices
        };
    }
    
    // Default event handlers
    defaultGestureHandler(fingerCount, result, confidence) {
        console.log(`👋 Gesture detected: ${fingerCount} fingers, confidence: ${Math.round(confidence * 100)}%`);
    }
    
    defaultStatusHandler(status, message) {
        console.log(`📊 Status: ${status} - ${message}`);
    }
    
    defaultErrorHandler(errorType, message) {
        console.error(`❌ Error [${errorType}]: ${message}`);
    }
    
    // Public API methods
    enable() { if (!this.isEnabled) this.toggleSystem(); }
    disable() { if (this.isEnabled) this.toggleSystem(); }
    
    async resetAllDevices() {
        try {
            const response = await fetch(`${this.config.apiUrl}/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                Object.keys(this.devices).forEach(id => {
                    this.devices[id].status = false;
                    this.updateDeviceUI(id);
                });
                
                console.log('🔄 All devices reset to OFF');
                this.speak('All devices reset');
            }
            
        } catch (error) {
            console.error('❌ Failed to reset devices:', error);
        }
    }
    
    updateSettings(newSettings) {
        this.config = { ...this.config, ...newSettings };
        
        if (this.hands) {
            this.hands.setOptions({
                minDetectionConfidence: this.config.sensitivity
            });
        }
        
        console.log('⚙️ Settings updated:', newSettings);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedGestureController;
} else {
    window.EnhancedGestureController = EnhancedGestureController;
}