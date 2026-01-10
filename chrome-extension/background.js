/**
 * Background Service Worker
 * Handles audio capture and WebSocket connection to live-shadow API
 */

let audioStream = null;
let websocket = null;
let mediaRecorder = null;
let isRecording = false;
let currentTabId = null;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_CALL') {
    currentTabId = sender.tab.id;
    startAudioCapture(sender.tab.id, message.callId, message.phoneNumber);
    sendResponse({ success: true });
  } else if (message.type === 'END_CALL') {
    stopAudioCapture(message.callId, message.recordingUrl);
    sendResponse({ success: true });
  } else if (message.type === 'GET_LEAD_CONTEXT') {
    getLeadContext(message.phoneNumber).then(context => {
      sendResponse({ context });
    });
    return true; // Async response
  }
});

/**
 * Connect to WebSocket server
 */
function connectWebSocket(wsUrl, callId, phoneNumber, tabId) {
  try {
    websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      // Send call metadata
      websocket.send(JSON.stringify({
        type: 'call_start',
        callId,
        phoneNumber,
        timestamp: Date.now(),
      }));
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data, tabId);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  } catch (error) {
    console.error('Error connecting WebSocket:', error);
  }
}

/**
 * Handle WebSocket messages and forward to content script
 */
function handleWebSocketMessage(data, tabId) {
  // Forward messages to content script
  if (tabId && currentTabId) {
    chrome.tabs.sendMessage(tabId, {
      type: 'WEBSOCKET_MESSAGE',
      data,
    }).catch((error) => {
      console.error('Error sending message to content script:', error);
    });
  }
}

/**
 * Start audio capture from Aircall tab
 */
async function startAudioCapture(tabId, callId, phoneNumber) {
  try {
    // Capture audio from the Aircall tab
    audioStream = await chrome.tabCapture.capture({
      audio: true,
      video: false,
    });

    if (!audioStream) {
      console.error('Failed to capture audio');
      return;
    }

    // Connect to WebSocket
    // Get API URL from storage or use default
    chrome.storage.local.get(['apiUrl'], (result) => {
      const apiUrl = result.apiUrl || 'http://localhost:3000';
      const wsUrl = `${apiUrl}/api/live-shadow`.replace('http', 'ws');
      connectWebSocket(wsUrl, callId, phoneNumber, tabId);
    });

    // Create MediaRecorder to stream audio
    mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && websocket && websocket.readyState === WebSocket.OPEN) {
        // Convert blob to base64 and send
        const reader = new FileReader();
        reader.onload = () => {
          websocket.send(JSON.stringify({
            type: 'audio_chunk',
            data: reader.result,
            timestamp: Date.now(),
          }));
        };
        reader.readAsDataURL(event.data);
      }
    };

    mediaRecorder.start(100); // Send chunks every 100ms
    isRecording = true;

    // Notify content script
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'AUDIO_CAPTURE_STARTED',
        callId,
      }).catch((error) => {
        console.error('Error notifying content script:', error);
      });
    }
  } catch (error) {
    console.error('Error starting audio capture:', error);
  }
}

/**
 * Stop audio capture and cleanup
 */
function stopAudioCapture(callId, recordingUrl) {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
  }

  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  if (websocket) {
    websocket.send(JSON.stringify({
      type: 'call_end',
      callId,
      recordingUrl,
      timestamp: Date.now(),
    }));
    websocket.close();
    websocket = null;
  }

  // Send to webhook for post-call processing
  if (callId && recordingUrl) {
    chrome.storage.local.get(['apiUrl'], async (result) => {
      const apiUrl = result.apiUrl || 'http://localhost:3000';
      try {
        await fetch(`${apiUrl}/api/vapi-webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'aircall_call_end',
            aircallCallId: callId,
            recordingUrl,
            phoneNumber: null, // Will be extracted from call metadata
          }),
        });
      } catch (error) {
        console.error('Error sending to webhook:', error);
      }
    });
  }

  currentTabId = null;
}

/**
 * Get lead context from Supabase
 */
async function getLeadContext(phoneNumber) {
  try {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiUrl'], async (result) => {
        const apiUrl = result.apiUrl || 'http://localhost:3000';
        try {
          const response = await fetch(
            `${apiUrl}/api/leads/context?phone=${encodeURIComponent(phoneNumber)}`
          );
          if (response.ok) {
            const data = await response.json();
            resolve(data);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Error fetching lead context:', error);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error in getLeadContext:', error);
    return null;
  }
}
