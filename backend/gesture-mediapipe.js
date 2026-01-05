/**
 * MediaPipe Hand Gesture Detection Integration for CareConnect
 * Handles 1-4 finger detection for LED control
 */

class MediaPipeGestureDetector {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.isInitialized = false;
        this.isDetecting = false;
        this.lastGesture = null;
        this.gestureTimeout = null;
        this.onGestureCallback = null;
        this.onStatusCallback = null;
        
        // Configuration
        this.config = {
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        };
        
        // Device mapping
        this.devices = {
            1: { name: 'Living Room LED', status: false },
            2: { name: 'Bedroom LED', status: false },
            3: { name: 'Kitchen LED', status: false },
            4: { name: 'Bathroom LED', status: false }
        };
        
        this.stats = {
            totalDetections: 0,
            successfulGestures: 0,
            lastDetectionTime: null
        };
    }
    
    async initialize() {
        try {
            console.log('🚀 Initializing MediaPipe Hand Detection...');
            
            // Check if MediaPipe is available
            if (!window.Hands || !window.Camera) {
                throw new Error('MediaPipe libraries not loaded');
            }
            
            // Initialize MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });
            
            this.hands.setOptions(this.config);
            this.hands.onResults((results) => this.processResults(results));
            
            this.isInitialized = true;
            console.log('✅ MediaPipe Hand Detection initialized');
            
            if (this.onStatusCallback) {
                this.onStatusCallback('initialized', 'MediaPipe ready for gesture detection');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize MediaPipe:', error);
            if (this.onStatusCallback) {
                this.onStatusCallback('error', `Initialization failed: ${error.message}`);
            }
            return false;
        }
    }
    
    async startDetection(videoElement) {
        if (!this.isInitialized) {
            console.log('⚠️ MediaPipe not initialized, attempting to initialize...');
            const initialized = await this.initialize();
            if (!initialized) return false;
        }
        
        try {
            console.log('📹 Starting gesture detection...');
            
            if (!videoElement) {
                throw new Error('Video element not provided');
            }
            
            // Initialize camera
            this.camera = new Camera(videoElement, {
                onFrame: async () => {
                    if (this.hands && this.isDetecting) {
                        await this.hands.send({ image: videoElement });
                    }
                },
                width: 640,
                height: 480
            });
            
            await this.camera.start();
            this.isDetecting = true;
            
            console.log('✅ Gesture detection started');
            
            if (this.onStatusCallback) {
                this.onStatusCallback('detecting', 'Gesture detection active');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to start detection:', error);
            if (this.onStatusCallback) {
                this.onStatusCallback('error', `Detection start failed: ${error.message}`);
            }
            return false;
        }
    }
    
    stopDetection() {
        console.log('🛑 Stopping gesture detection...');
        
        this.isDetecting = false;
        
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }
        
        clearTimeout(this.gestureTimeout);
        
        if (this.onStatusCallback) {
            this.onStatusCallback('stopped', 'Gesture detection stopped');
        }
        
        console.log('✅ Gesture detection stopped');
    }
    
    processResults(results) {
        this.stats.totalDetections++;
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const fingerCount = this.countFingers(landmarks);
            const confidence = this.calculateConfidence(landmarks);
            
            // Process gesture with debouncing
            this.processGesture(fingerCount, confidence, landmarks);
            
            // Update last detection time
            this.stats.lastDetectionTime = Date.now();
            
        } else {
            // No hand detected
            if (this.onStatusCallback) {
                this.onStatusCallback('no_hand', 'No hand detected - Show your hand to the camera');
            }
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
    
    processGesture(fingerCount, confidence, landmarks) {
        // Only process valid finger counts with sufficient confidence
        if (fingerCount < 1 || fingerCount > 4 || confidence < this.config.minDetectionConfidence) {
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
            
        }, 100); // Small delay for stability
    }
    
    async executeGesture(fingerCount, confidence, landmarks) {
        console.log(`👋 Executing ${fingerCount} finger gesture (confidence: ${Math.round(confidence * 100)}%)`);
        
        try {
            this.stats.successfulGestures++;
            
            // Toggle device state
            if (this.devices[fingerCount]) {
                this.devices[fingerCount].status = !this.devices[fingerCount].status;
                
                const device = this.devices[fingerCount];
                const action = device.status ? 'activated' : 'deactivated';
                
                console.log(`💡 ${device.name} ${action}`);
                
                // Trigger callback if available
                if (this.onGestureCallback) {
                    this.onGestureCallback({
                        fingerCount,
                        confidence,
                        device,
                        action,
                        timestamp: Date.now(),
                        landmarks
                    });
                }
                
                // Send to backend API
                await this.sendToBackend(fingerCount, device.status, confidence);
            }
            
        } catch (error) {
            console.error('❌ Failed to execute gesture:', error);
        }
    }
    
    async sendToBackend(deviceId, status, confidence) {
        try {
            const response = await fetch('http://localhost:3001/api/gesture/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gestureType: `${deviceId} finger(s)`,
                    fingerCount: deviceId,
                    confidence: confidence,
                    timestamp: Date.now()
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend sync successful:', result.message);
            }
            
        } catch (error) {
            console.log('📱 Backend sync failed, using local mode');
        }
    }
    
    // Public API methods
    setGestureCallback(callback) {
        this.onGestureCallback = callback;
    }
    
    setStatusCallback(callback) {
        this.onStatusCallback = callback;
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.hands) {
            this.hands.setOptions(this.config);
        }
    }
    
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalDetections > 0 ? 
                (this.stats.successfulGestures / this.stats.totalDetections * 100).toFixed(1) : 0,
            isInitialized: this.isInitialized,
            isDetecting: this.isDetecting,
            devices: this.devices
        };
    }
    
    simulateGesture(fingerCount) {
        console.log(`🧪 Simulating ${fingerCount} finger gesture`);
        
        const mockLandmarks = this.generateMockLandmarks();
        this.executeGesture(fingerCount, 0.95, mockLandmarks);
    }
    
    generateMockLandmarks() {
        // Generate mock landmarks for simulation
        const landmarks = [];
        for (let i = 0; i < 21; i++) {
            landmarks.push({
                x: Math.random() * 0.8 + 0.1,
                y: Math.random() * 0.8 + 0.1,
                z: Math.random() * 0.1
            });
        }
        return landmarks;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaPipeGestureDetector;
} else {
    window.MediaPipeGestureDetector = MediaPipeGestureDetector;
}