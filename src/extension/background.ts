/**
 * Background Service Worker (TypeScript)
 * Handles audio capture and WebSocket connection
 */

let audioStream: MediaStream | null = null;
let websocket: WebSocket | null = null;
let mediaRecorder: MediaRecorder | null = null;
let isRecording = false;
let currentTabId: number | null = null;
let currentCallId: string | null = null;

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.type === 'START_CALL') {
      currentTabId = sender.tab?.id || null;
      currentCallId = message.callId;
      startAudioCapture(sender.tab?.id, message.callId, message.phoneNumber);
      sendResponse({ success: true });
    } else if (message.type === 'END_CALL') {
      stopAudioCapture(message.callId, message.recordingUrl);
      sendResponse({ success: true });
    } else if (message.type === 'GET_LEAD_CONTEXT') {
      getLeadContext(message.phoneNumber).then((context) => {
        sendResponse({ context });
      });
      return true; // Async response
    }
  }
);

/**
 * Connect to WebSocket server
 */
function connectWebSocket(
  wsUrl: string,
  callId: string,
  phoneNumber: string | null,
  tabId: number | null
) {
  try {
    websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      // Send call metadata
      websocket?.send(
        JSON.stringify({
          type: 'call_start',
          callId,
          phoneNumber,
          timestamp: Date.now(),
        })
      );
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

    websocket.onclose = () => {
      console.log('WebSocket closed');
      websocket = null;
    };
  } catch (error) {
    console.error('Error connecting WebSocket:', error);
  }
}

/**
 * Handle WebSocket messages and forward to content script
 */
function handleWebSocketMessage(data: any, tabId: number | null) {
  if (!tabId || !currentTabId) return;

  // Forward to content script
  chrome.tabs.sendMessage(tabId, {
    type: 'WEBSOCKET_MESSAGE',
    data,
  }).catch((error) => {
    console.error('Error sending message to content script:', error);
  });

  // Handle specific message types
  if (data.type === 'rebuttal_detected') {
    chrome.tabs.sendMessage(tabId, {
      type: 'REBUTTAL_DETECTED',
      rebuttal: data.rebuttal,
    });
  } else if (data.type === 'certainty_update') {
    chrome.tabs.sendMessage(tabId, {
      type: 'CERTAINTY_UPDATE',
      value: data.value,
    });
  } else if (data.type === 'sentiment_update') {
    chrome.tabs.sendMessage(tabId, {
      type: 'SENTIMENT_UPDATE',
      sentiment: data.sentiment,
    });
  } else if (data.type === 'transcript_update') {
    chrome.tabs.sendMessage(tabId, {
      type: 'TRANSCRIPT_UPDATE',
      text: data.text,
    });
  }
}

/**
 * Start audio capture from Aircall tab
 */
async function startAudioCapture(
  tabId: number | undefined,
  callId: string,
  phoneNumber: string | null
) {
  if (!tabId) {
    console.error('No tab ID provided');
    return;
  }

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

    // Get API URL from storage
    chrome.storage.local.get(['apiUrl'], (result) => {
      const apiUrl = result.apiUrl || 'http://localhost:3000';
      const wsUrl = `${apiUrl}/api/live-shadow`.replace('http', 'ws');
      connectWebSocket(wsUrl, callId, phoneNumber, tabId);
    });

    // Create MediaRecorder to stream audio
    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/ogg';

    mediaRecorder = new MediaRecorder(audioStream, {
      mimeType,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (
        event.data.size > 0 &&
        websocket &&
        websocket.readyState === WebSocket.OPEN
      ) {
        // Convert blob to base64 and send
        const reader = new FileReader();
        reader.onload = () => {
          websocket?.send(
            JSON.stringify({
              type: 'audio_chunk',
              data: reader.result,
              timestamp: Date.now(),
            })
          );
        };
        reader.readAsDataURL(event.data);
      }
    };

    mediaRecorder.start(100); // Send chunks every 100ms
    isRecording = true;

    // Notify content script
    chrome.tabs.sendMessage(tabId, {
      type: 'AUDIO_CAPTURE_STARTED',
      callId,
    }).catch((error) => {
      console.error('Error notifying content script:', error);
    });
  } catch (error) {
    console.error('Error starting audio capture:', error);
  }
}

/**
 * Stop audio capture and cleanup
 */
function stopAudioCapture(callId: string | null, recordingUrl: string | null) {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
  }

  if (audioStream) {
    audioStream.getTracks().forEach((track) => track.stop());
    audioStream = null;
  }

  if (websocket) {
    websocket.send(
      JSON.stringify({
        type: 'call_end',
        callId,
        recordingUrl,
        timestamp: Date.now(),
      })
    );
    websocket.close();
    websocket = null;
  }

  // Send to webhook for post-call processing
  if (callId) {
    chrome.storage.local.get(['apiUrl'], async (result) => {
      const apiUrl = result.apiUrl || 'http://localhost:3000';
      try {
        await fetch(`${apiUrl}/api/vapi-webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'aircall_call_end',
            aircallCallId: callId,
            recordingUrl: recordingUrl || null,
            phoneNumber: null,
          }),
        });
      } catch (error) {
        console.error('Error sending to webhook:', error);
      }
    });
  }

  currentTabId = null;
  currentCallId = null;
}

/**
 * Get lead context from API
 */
async function getLeadContext(phoneNumber: string | null): Promise<any> {
  if (!phoneNumber) return null;

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
}
