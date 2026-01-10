/**
 * Content Script for Aircall Integration
 * Detects call state and injects Shadow Overlay sidebar
 */

import { ShadowOverlay } from './ShadowOverlay';

let overlay: ShadowOverlay | null = null;
let callObserver: MutationObserver | null = null;
let isCallActive = false;
let currentCallId: string | null = null;
let currentPhoneNumber: string | null = null;

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('Sales Goat Shadow Mode: Initializing...');
  
  // Check if Shadow Mode is enabled
  chrome.storage.local.get(['shadowModeEnabled'], (result) => {
    if (result.shadowModeEnabled !== false) {
      startMonitoring();
    }
  });

  // Listen for enable/disable toggle
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHADOW_MODE_TOGGLE') {
      if (message.enabled) {
        startMonitoring();
      } else {
        stopMonitoring();
      }
    } else if (message.type === 'REBUTTAL_DETECTED') {
      overlay?.displayRebuttal(message.rebuttal);
    } else if (message.type === 'CERTAINTY_UPDATE') {
      overlay?.updateCertainty(message.value);
    } else if (message.type === 'SENTIMENT_UPDATE') {
      overlay?.updateSentiment(message.sentiment);
    } else if (message.type === 'TRANSCRIPT_UPDATE') {
      overlay?.updateTranscript(message.text);
    } else if (message.type === 'LEAD_CONTEXT') {
      overlay?.displayLeadContext(message.context);
    }
  });
}

function startMonitoring() {
  // Inject overlay
  if (!overlay) {
    overlay = new ShadowOverlay();
    overlay.inject();
  }

  // Start observing Aircall UI
  observeAircallUI();
}

function stopMonitoring() {
  if (callObserver) {
    callObserver.disconnect();
    callObserver = null;
  }

  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  isCallActive = false;
  currentCallId = null;
  currentPhoneNumber = null;
}

/**
 * Observe Aircall UI for call state changes
 */
function observeAircallUI() {
  // Aircall-specific selectors (adjust based on actual DOM structure)
  const aircallSelectors = {
    callActive: [
      '[data-testid="call-active"]',
      '.call-active',
      '[class*="call-active"]',
      '[class*="in-call"]',
      '.keypad', // Aircall keypad appears when call is active
      '[aria-label*="call"][aria-pressed="true"]',
    ],
    phoneNumber: [
      '[data-testid="phone-number"]',
      '.phone-number',
      '[class*="phone-number"]',
      'input[type="tel"]',
      '[aria-label*="phone"]',
      '.contact-phone',
    ],
    callButton: [
      '[data-testid="call-button"]',
      'button[aria-label*="Call"]',
      '.call-button',
    ],
  };

  callObserver = new MutationObserver(() => {
    checkCallState(aircallSelectors);
  });

  callObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-state', 'aria-pressed'],
  });

  // Initial check
  checkCallState(aircallSelectors);

  // Periodic check as fallback
  setInterval(() => checkCallState(aircallSelectors), 2000);
}

/**
 * Check if a call is active in Aircall
 */
function checkCallState(selectors: any) {
  // Check for active call indicators
  const callActiveIndicator = selectors.callActive.find((sel: string) => 
    document.querySelector(sel)
  );

  const wasActive = isCallActive;
  isCallActive = !!callActiveIndicator;

  if (isCallActive && !wasActive) {
    // Call just started
    handleCallStart(selectors);
  } else if (!isCallActive && wasActive) {
    // Call just ended
    handleCallEnd();
  }
}

/**
 * Extract phone number from Aircall UI
 */
function extractPhoneNumber(selectors: any): string | null {
  for (const selector of selectors.phoneNumber) {
    const element = document.querySelector(selector);
    if (element) {
      const phoneNumber = 
        element.textContent || 
        element.getAttribute('value') || 
        element.getAttribute('data-phone') ||
        (element as HTMLInputElement).value;
      
      if (phoneNumber) {
        // Normalize phone number (remove formatting)
        return phoneNumber.replace(/\D/g, '');
      }
    }
  }
  return null;
}

/**
 * Handle call start
 */
async function handleCallStart(selectors: any) {
  console.log('Sales Goat: Call started');
  
  currentPhoneNumber = extractPhoneNumber(selectors);
  currentCallId = `aircall-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (!currentPhoneNumber) {
    console.warn('Could not extract phone number');
    // Continue anyway - phone number might be available later
  }

  // Show overlay
  if (overlay) {
    overlay.show();
    overlay.updateState('connecting');
  }

  // Get lead context
  if (currentPhoneNumber) {
    chrome.runtime.sendMessage({
      type: 'GET_LEAD_CONTEXT',
      phoneNumber: currentPhoneNumber,
    }, (response) => {
      if (response?.context && overlay) {
        overlay.displayLeadContext(response.context);
      }
    });
  }

  // Notify background script to start audio capture
  chrome.runtime.sendMessage({
    type: 'START_CALL',
    callId: currentCallId,
    phoneNumber: currentPhoneNumber,
  });
}

/**
 * Handle call end
 */
function handleCallEnd() {
  console.log('Sales Goat: Call ended');
  
  isCallActive = false;

  // Get Aircall recording URL if available
  const recordingUrl = extractRecordingUrl();

  // Notify background script
  chrome.runtime.sendMessage({
    type: 'END_CALL',
    callId: currentCallId,
    recordingUrl,
  });

  if (overlay) {
    overlay.updateState('ended');
  }

  // Hide overlay after delay
  setTimeout(() => {
    if (overlay && !isCallActive) {
      overlay.hide();
    }
    currentCallId = null;
    currentPhoneNumber = null;
  }, 5000);
}

/**
 * Extract recording URL from Aircall
 */
function extractRecordingUrl(): string | null {
  const selectors = [
    '[data-testid="recording-link"]',
    'a[href*="recording"]',
    '[class*="recording"] a',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const url = (element as HTMLAnchorElement).href || element.getAttribute('href');
      if (url) return url;
    }
  }

  return null;
}
