# Gesture Control Guide

## How Gesture Control Works

The system uses **MediaPipe Hand Tracking** to detect hand gestures through your camera and control LEDs based on the number of fingers shown.

## Supported Gestures

### Finger Count Controls
- **1 Finger** → Toggle LED 1 ON/OFF
- **2 Fingers** → Toggle LED 2 ON/OFF  
- **3 Fingers** → Toggle LED 3 ON/OFF
- **4 Fingers** → Toggle LED 4 ON/OFF

## How to Use

1. Click the 👋 **Gesture Control** button
2. Allow camera access when prompted
3. Position your hand in front of the camera
4. Show 1, 2, 3, or 4 fingers to toggle the corresponding LED
5. The system has a 1-second debounce to prevent accidental triggers

## Visual Feedback

- **Green lines** show hand skeleton tracking
- **Red dots** show hand landmarks
- **Real-time finger count** displayed on screen
- **Toggle confirmation** shows which LED was changed

## Tips for Best Results

- **Good lighting** improves detection accuracy
- **Clear background** helps hand tracking
- **Hold gesture steady** for 1 second
- **Face the camera** with palm visible
- **Keep hand in frame** for consistent tracking

## Browser Requirements

- **Chrome, Edge, or Safari** (latest versions)
- **Camera access permission** required
- **HTTPS connection** recommended for production
- **Good internet connection** for MediaPipe libraries

## Troubleshooting

- If camera doesn't start: Check browser permissions
- If gestures aren't detected: Improve lighting and hand position
- If detection is slow: Ensure stable internet connection