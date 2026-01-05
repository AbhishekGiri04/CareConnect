# Cloudinary Integration Setup

## Overview

The security system now automatically captures and uploads unauthorized face images to Cloudinary, stores data in CSV format, and provides download functionality.

## Cloudinary Configuration

### 1. Create Upload Preset
1. Go to Cloudinary Console → Settings → Upload
2. Click "Add upload preset"
3. Set preset name: `ml_default`
4. Set signing mode: **Unsigned**
5. Set folder: `smart_home_security`
6. Save preset

### 2. Update Configuration
Replace the cloud name in script.js:
```javascript
const CLOUDINARY_CONFIG = {
    cloudName: 'YOUR_CLOUD_NAME', // Replace with your actual cloud name
    apiKey: '733948694482576',
    // Note: API secret not needed for unsigned uploads
};
```

## Features Added

### 📸 Automatic Image Capture
- **Real-time capture** when unauthorized faces detected
- **High-quality JPEG** format (80% compression)
- **Automatic upload** to Cloudinary cloud storage
- **Unique filenames** with timestamp

### 🔗 Cloudinary Integration
- **Secure URLs** for all uploaded images
- **Organized storage** in `smart_home_security` folder
- **CDN delivery** for fast image loading
- **Automatic optimization** by Cloudinary

### 📊 Enhanced CSV Export
```csv
Timestamp,ISO_Timestamp,Intruder_Count,Total_Faces,Severity,Location,Image_URL,Incident_ID
"12/25/2023, 10:30:45 AM","2023-12-25T15:30:45.123Z",2,3,"High","Smart Home Security Camera","https://res.cloudinary.com/...","1703518245123"
```

### 🖼️ Intruder Gallery
- **Visual gallery** of captured intruder images
- **Click to enlarge** functionality
- **Timestamp information** for each image
- **Latest 10 images** displayed

### 💾 Auto-Save Functionality
- **Automatic CSV save** when app is closed
- **Session persistence** across browser restarts
- **Background saving** on each new incident
- **Recovery notification** on app restart

## CSV Data Structure

| Field | Description | Example |
|-------|-------------|---------|
| Timestamp | Human-readable time | "12/25/2023, 10:30:45 AM" |
| ISO_Timestamp | Machine-readable time | "2023-12-25T15:30:45.123Z" |
| Intruder_Count | Number of unauthorized faces | 2 |
| Total_Faces | Total faces in frame | 3 |
| Severity | Risk level (Medium/High) | "High" |
| Location | Camera location | "Smart Home Security Camera" |
| Image_URL | Cloudinary image link | "https://res.cloudinary.com/..." |
| Incident_ID | Unique identifier | 1703518245123 |

## Usage Instructions

### For Users:
1. **Automatic Operation** - No setup required
2. **Download CSV** - Click "📥 Download CSV" button anytime
3. **View Images** - Check intruder gallery below logs
4. **Clear Data** - Use "🗑️ Clear Logs" to reset

### For Developers:
1. **Set up Cloudinary account** and get cloud name
2. **Create unsigned upload preset** named `ml_default`
3. **Update cloud name** in script.js configuration
4. **Test upload functionality** with security monitoring

## Security & Privacy

### Data Storage:
- **Images**: Stored in Cloudinary cloud (secure CDN)
- **Logs**: Stored in browser localStorage (local only)
- **CSV**: Generated on-demand (no server storage)

### Privacy Protection:
- **No server storage** - All processing client-side
- **User control** - Can clear all data anytime
- **Secure URLs** - Cloudinary provides HTTPS links
- **Local processing** - Face detection runs in browser

## Troubleshooting

### Upload Failures:
- Check internet connection
- Verify Cloudinary cloud name
- Ensure upload preset exists and is unsigned
- Check browser console for errors

### CSV Issues:
- Ensure browser supports download attribute
- Check if popup blocker is interfering
- Verify localStorage has data

### Image Display:
- Check Cloudinary URLs are accessible
- Verify CORS settings if needed
- Ensure images uploaded successfully

## File Management

### Automatic Files:
- `security_logs_YYYY-MM-DD.csv` - Downloaded CSV files
- Browser localStorage - Persistent log storage
- Cloudinary folder - `smart_home_security/intruder_TIMESTAMP.jpg`

### Manual Cleanup:
- Clear browser localStorage to reset logs
- Delete Cloudinary images through console
- Download CSV before clearing for backup