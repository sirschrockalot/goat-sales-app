# Sales Goat Shadow Mode - Chrome Extension

Chrome Extension that provides real-time AI coaching overlay for Aircall calls.

## Features

- **Real-time Audio Capture**: Captures audio from Aircall tabs using `chrome.tabCapture`
- **Live Coaching**: WebSocket connection to `/api/live-shadow` for real-time analysis
- **Lead Context**: Automatically loads fact-finding data from previous calls
- **Rebuttal Display**: Shows Eric Cline rebuttals when objections are detected
- **Certainty Meter**: Real-time confidence tracking for the sales rep
- **Sentiment Analysis**: Monitors lead sentiment and provides coaching
- **Post-Call Automation**: Sends call data to webhook for debrief

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension icon should appear in your toolbar

## Configuration

1. Click the extension icon
2. Click "Enable Shadow Mode"
3. Navigate to Aircall (https://aircall.io)
4. The sidebar will appear when a call becomes active

## How It Works

### Call Detection
- Uses `MutationObserver` to watch Aircall UI for call state changes
- Detects when call becomes active via DOM selectors
- Extracts phone number from Aircall interface

### Audio Capture
- Uses `chrome.tabCapture` API to capture audio from Aircall tab
- Streams audio chunks to WebSocket server every 100ms
- Server processes audio for objection detection and sentiment analysis

### Lead Context
- Queries `/api/leads/context` with phone number
- Displays previous call history and fact-finding data
- Shows last score and call count

### Real-time Coaching
- WebSocket receives:
  - Objection detection → Shows rebuttal
  - Certainty updates → Updates meter
  - Sentiment changes → Updates coaching text

### Post-Call
- When call ends, sends to `/api/vapi-webhook`:
  - Aircall call ID
  - Recording URL
  - Transcript (if available)
- Triggers automatic grading and debrief

## API Endpoints Required

- `GET /api/leads/context?phone=...` - Lead context lookup
- `WebSocket /api/live-shadow` - Real-time audio streaming
- `POST /api/vapi-webhook` - Post-call processing

## Development

### Testing Locally

1. Update `background.js` and `content.js` with your local API URL:
   ```javascript
   const API_URL = 'http://localhost:3000';
   ```

2. Load extension in Chrome
3. Open Aircall in a tab
4. Start a call to test

### Building for Production

1. Update API URLs to production domain
2. Test all features end-to-end
3. Package extension (zip the folder)
4. Submit to Chrome Web Store (optional)

## Notes

- **WebSocket Server**: Next.js API routes don't natively support WebSocket. Consider:
  - Separate WebSocket server (Node.js + ws)
  - Service like Pusher, Ably, or similar
  - Next.js experimental WebSocket support

- **Aircall Selectors**: The DOM selectors in `content.js` may need adjustment based on Aircall's actual UI structure. Test and update as needed.

- **Audio Format**: Currently using `audio/webm`. Adjust `mimeType` in `background.js` if needed.

## Security

- Extension only requests permissions for Aircall domain
- Audio data is encrypted in transit (WSS)
- No audio is stored locally
- All data sent to your secure API endpoints
