class GestureController {
    constructor() {
        this.isEnabled = false;
        this.cameraActive = false;
        this.hands = null;
        this.camera = null;
        this.devices = {
            1: { name: 'Living Room LED', status: false },
            2: { name: 'Bedroom LED', status: false },
            3: { name: 'Kitchen LED', status: false },
            4: { name: 'Bathroom LED', status: false }
        };
        this.settings = {
            sensitivity: 'medium',
            range: 'medium',
            response: 'instant'
        };
        this.lastGesture = null;
        this.gestureTimeout = null;
        this.apiUrl = 'http://localhost:3001/api/gesture';
    }

    async init() {
        this.bindEvents();
        this.updateUI();
        await this.loadDevices();
    }

    bindEvents() {
        const enableBtn = document.getElementById('enable-btn');
        const startCamera = document.getElementById('start-camera');
        
        if (enableBtn) enableBtn.addEventListener('click', () => this.toggleSystem());
        if (startCamera) startCamera.addEventListener('click', () => this.toggleCamera());
        
        document.querySelectorAll('.test-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fingers = parseInt(e.target.dataset.fingers);
                this.simulateGesture(fingers);
            });
        });

        const sensitivitySelect = document.getElementById('sensitivity');
        const rangeSelect = document.getElementById('range');
        const responseSelect = document.getElementById('response');

        if (sensitivitySelect) {
            sensitivitySelect.addEventListener('change', (e) => {
                this.settings.sensitivity = e.target.value;
                this.updateSettings();
            });
        }

        if (rangeSelect) {
            rangeSelect.addEventListener('change', (e) => {
                this.settings.range = e.target.value;
                this.updateSettings();
            });
        }

        if (responseSelect) {
            responseSelect.addEventListener('change', (e) => {
                this.settings.response = e.target.value;
                this.updateSettings();
            });
        }
    }

    async loadDevices() {
        try {
            const response = await fetch(`${this.apiUrl}/devices`);
            const data = await response.json();
            if (data.success) {
                this.devices = data.devices;
                this.updateAllDeviceUI();
            }
        } catch (error) {
            console.log('Using local device storage');
        }
    }

    toggleSystem() {
        this.isEnabled = !this.isEnabled;
        this.updateUI();
        
        if (this.isEnabled) {
            this.initHandTracking();
        } else {
            this.stopHandTracking();
        }
    }

    toggleCamera() {
        if (!this.cameraActive) {
            this.startCamera();
        } else {
            this.stopCamera();
        }
    }

    async startCamera() {
        try {
            const video = document.getElementById('video');
            if (!video) return;

            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            video.srcObject = stream;
            this.cameraActive = true;
            this.updateUI();
            
            if (this.isEnabled) {
                this.initHandTracking();
            }
        } catch (error) {
            console.error('Camera access denied:', error);
            this.showStatus('Camera access required for gesture control', 'error');
        }
    }

    stopCamera() {
        const video = document.getElementById('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        this.cameraActive = false;
        this.stopHandTracking();
        this.updateUI();
    }

    initHandTracking() {
        if (!this.cameraActive || !window.Hands) return;

        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: this.getSensitivityValue(),
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.onResults(results));

        const video = document.getElementById('video');
        if (!video) return;

        this.camera = new Camera(video, {
            onFrame: async () => {
                if (this.hands) {
                    await this.hands.send({ image: video });
                }
            },
            width: 640,
            height: 480
        });

        this.camera.start();
    }

    stopHandTracking() {
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }
        if (this.hands) {
            this.hands.close();
            this.hands = null;
        }
    }

    onResults(results) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        canvas.width = 640;
        canvas.height = 480;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const fingerCount = this.countFingers(landmarks);
            
            this.drawHand(ctx, landmarks);
            this.processGesture(fingerCount);
            
            this.showStatus(`Detected: ${fingerCount} finger(s)`, 'success');
        } else {
            this.showStatus('No hand detected', 'info');
        }
    }

    countFingers(landmarks) {
        const tips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
        const pips = [3, 6, 10, 14, 18];
        let count = 0;

        // Thumb (different logic)
        if (landmarks[tips[0]].x > landmarks[pips[0]].x) count++;
        
        // Other fingers
        for (let i = 1; i < 5; i++) {
            if (landmarks[tips[i]].y < landmarks[pips[i]].y) count++;
        }

        return Math.min(count, 4); // Max 4 for our use case
    }

    drawHand(ctx, landmarks) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#FF0000';

        // Draw landmarks
        landmarks.forEach(landmark => {
            ctx.beginPath();
            ctx.arc(landmark.x * 640, landmark.y * 480, 3, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw connections
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

    processGesture(fingerCount) {
        if (fingerCount >= 1 && fingerCount <= 4 && fingerCount !== this.lastGesture) {
            const delay = this.getResponseDelay();
            
            clearTimeout(this.gestureTimeout);
            this.gestureTimeout = setTimeout(() => {
                this.toggleDevice(fingerCount);
                this.lastGesture = fingerCount;
                
                setTimeout(() => {
                    this.lastGesture = null;
                }, 1000);
            }, delay);
        }
    }

    simulateGesture(fingers) {
        this.toggleDevice(fingers);
        this.showStatus(`Simulated: ${fingers} finger(s)`, 'success');
    }

    async toggleDevice(deviceId) {
        if (!this.devices[deviceId]) return;

        const newStatus = !this.devices[deviceId].status;
        this.devices[deviceId].status = newStatus;
        this.updateDeviceUI(deviceId);
        
        // Send to backend
        await this.sendToBackend(deviceId, newStatus);
        
        // Voice feedback
        this.speak(`${this.devices[deviceId].name} ${newStatus ? 'on' : 'off'}`);
    }

    async sendToBackend(deviceId, status) {
        try {
            const response = await fetch(`${this.apiUrl}/devices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, status, timestamp: Date.now() })
            });
            
            if (!response.ok) {
                throw new Error('Backend not available');
            }
            
            const data = await response.json();
            console.log('Device updated:', data.message);
        } catch (error) {
            console.log('Backend not available, using localStorage');
            const devices = JSON.parse(localStorage.getItem('gestureDevices') || '{}');
            devices[deviceId] = { status, timestamp: Date.now() };
            localStorage.setItem('gestureDevices', JSON.stringify(devices));
        }
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.2;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
        }
    }

    getSensitivityValue() {
        const values = { low: 0.3, medium: 0.5, high: 0.7 };
        return values[this.settings.sensitivity] || 0.5;
    }

    getResponseDelay() {
        const delays = { instant: 0, delayed: 500, slow: 1000 };
        return delays[this.settings.response] || 0;
    }

    updateSettings() {
        if (this.hands) {
            this.hands.setOptions({
                minDetectionConfidence: this.getSensitivityValue()
            });
        }
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('detection-info');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-${type}`;
        }
    }

    updateUI() {
        const enableBtn = document.getElementById('enable-btn');
        const statusText = document.getElementById('status-text');
        const systemStatus = document.getElementById('system-status');
        const systemText = document.getElementById('system-text');
        const cameraStatus = document.getElementById('camera-status');
        const startCameraBtn = document.getElementById('start-camera');

        if (enableBtn) {
            enableBtn.textContent = this.isEnabled ? 'Disable' : 'Enable';
            enableBtn.classList.toggle('active', this.isEnabled);
        }

        if (statusText) {
            statusText.textContent = this.isEnabled ? 'Enabled' : 'Disabled';
        }

        if (systemStatus) {
            systemStatus.textContent = this.isEnabled ? '🟢' : '🔴';
            systemStatus.className = `status-dot ${this.isEnabled ? 'green' : 'red'}`;
        }

        if (systemText) {
            systemText.textContent = this.isEnabled ? 'Active' : 'Inactive';
        }

        if (startCameraBtn) {
            startCameraBtn.textContent = this.cameraActive ? '⏹️ Stop Camera' : '▶️ Start Camera';
        }

        if (cameraStatus) {
            cameraStatus.textContent = `Camera: ${this.cameraActive ? 'Active' : 'Inactive'}`;
        }
    }

    updateDeviceUI(deviceId) {
        const deviceCard = document.querySelector(`[data-device="${deviceId}"]`);
        if (!deviceCard) return;
        
        const statusElement = deviceCard.querySelector('.device-status');
        if (!statusElement) return;
        
        if (this.devices[deviceId].status) {
            statusElement.textContent = 'ON';
            statusElement.className = 'device-status on';
        } else {
            statusElement.textContent = 'OFF';
            statusElement.className = 'device-status off';
        }
    }

    updateAllDeviceUI() {
        Object.keys(this.devices).forEach(deviceId => {
            this.updateDeviceUI(deviceId);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GestureController;
} else {
    window.GestureController = GestureController;
}