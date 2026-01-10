/**
 * Content Script for Aircall Integration
 * Detects call state and injects Shadow Overlay sidebar
 * Compiled from TypeScript source
 */

(function() {
  'use strict';

  let overlay = null;
  let callObserver = null;
  let isCallActive = false;
  let currentCallId = null;
  let currentPhoneNumber = null;

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

    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SHADOW_MODE_TOGGLE') {
        if (message.enabled) {
          startMonitoring();
        } else {
          stopMonitoring();
        }
      } else if (message.type === 'REBUTTAL_DETECTED') {
        if (overlay) overlay.displayRebuttal(message.rebuttal);
      } else if (message.type === 'CERTAINTY_UPDATE') {
        if (overlay) overlay.updateCertainty(message.value);
      } else if (message.type === 'SENTIMENT_UPDATE') {
        if (overlay) overlay.updateSentiment(message.sentiment);
      } else if (message.type === 'TRANSCRIPT_UPDATE') {
        if (overlay) overlay.updateTranscript(message.text);
      } else if (message.type === 'LEAD_CONTEXT') {
        if (overlay) overlay.displayLeadContext(message.context);
      } else if (message.type === 'WEBSOCKET_MESSAGE') {
        handleWebSocketMessage(message.data);
      }
    });
  }

  function startMonitoring() {
    if (!overlay) {
      overlay = new ShadowOverlay();
      overlay.inject();
    }
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
  }

  function observeAircallUI() {
    const aircallSelectors = {
      callActive: [
        '[data-testid="call-active"]',
        '.call-active',
        '[class*="call-active"]',
        '[class*="in-call"]',
        '.keypad',
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

    checkCallState(aircallSelectors);
    setInterval(() => checkCallState(aircallSelectors), 2000);
  }

  function checkCallState(selectors) {
    const callActiveIndicator = selectors.callActive.find(sel => 
      document.querySelector(sel)
    );
    const wasActive = isCallActive;
    isCallActive = !!callActiveIndicator;

    if (isCallActive && !wasActive) {
      handleCallStart(selectors);
    } else if (!isCallActive && wasActive) {
      handleCallEnd();
    }
  }

  function extractPhoneNumber(selectors) {
    for (const selector of selectors.phoneNumber) {
      const element = document.querySelector(selector);
      if (element) {
        const phoneNumber = 
          element.textContent || 
          element.getAttribute('value') || 
          element.getAttribute('data-phone') ||
          (element.value || '');
        if (phoneNumber) {
          return phoneNumber.replace(/\D/g, '');
        }
      }
    }
    return null;
  }

  async function handleCallStart(selectors) {
    console.log('Sales Goat: Call started');
    currentPhoneNumber = extractPhoneNumber(selectors);
    currentCallId = `aircall-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (overlay) {
      overlay.show();
      overlay.updateState('connecting');
    }

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

    chrome.runtime.sendMessage({
      type: 'START_CALL',
      callId: currentCallId,
      phoneNumber: currentPhoneNumber,
    });
  }

  function handleCallEnd() {
    console.log('Sales Goat: Call ended');
    isCallActive = false;
    const recordingUrl = extractRecordingUrl();

    chrome.runtime.sendMessage({
      type: 'END_CALL',
      callId: currentCallId,
      recordingUrl,
    });

    if (overlay) {
      overlay.updateState('ended');
    }

    setTimeout(() => {
      if (overlay && !isCallActive) {
        overlay.hide();
      }
      currentCallId = null;
      currentPhoneNumber = null;
    }, 5000);
  }

  function extractRecordingUrl() {
    const selectors = [
      '[data-testid="recording-link"]',
      'a[href*="recording"]',
      '[class*="recording"] a',
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const url = element.href || element.getAttribute('href');
        if (url) return url;
      }
    }
    return null;
  }

  function handleWebSocketMessage(data) {
    if (data.type === 'rebuttal_detected' && overlay) {
      overlay.displayRebuttal(data.rebuttal);
    } else if (data.type === 'certainty_update' && overlay) {
      overlay.updateCertainty(data.value);
    } else if (data.type === 'sentiment_update' && overlay) {
      overlay.updateSentiment(data.sentiment);
    } else if (data.type === 'transcript_update' && overlay) {
      overlay.updateTranscript(data.text);
    }
  }

  // ShadowOverlay class (vanilla JS implementation)
  class ShadowOverlay {
    constructor() {
      this.container = null;
      this.isVisible = false;
      this.state = 'idle';
      this.certainty = 50;
      this.sentiment = 'Neutral';
      this.transcript = '';
      this.rebuttal = null;
      this.leadContext = null;
      this.isCollapsed = false;
    }

    inject() {
      if (document.getElementById('sales-goat-shadow-overlay')) return;

      this.container = document.createElement('div');
      this.container.id = 'sales-goat-shadow-overlay';
      document.body.appendChild(this.container);
      this.render();
    }

    remove() {
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
    }

    show() {
      this.isVisible = true;
      this.render();
    }

    hide() {
      this.isVisible = false;
      this.render();
    }

    updateState(state) {
      this.state = state;
      this.render();
    }

    updateCertainty(value) {
      this.certainty = Math.max(0, Math.min(100, value));
      this.render();
    }

    updateSentiment(sentiment) {
      this.sentiment = sentiment;
      this.render();
    }

    updateTranscript(text) {
      this.transcript = text;
      this.render();
    }

    displayRebuttal(rebuttal) {
      this.rebuttal = rebuttal;
      this.render();
    }

    displayLeadContext(context) {
      this.leadContext = context;
      this.render();
    }

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
      this.render();
    }

    render() {
      if (!this.container || !this.isVisible) {
        if (this.container) this.container.style.display = 'none';
        return;
      }

      const width = this.isCollapsed ? '60px' : '380px';
      const right = this.isCollapsed ? '340px' : '0';

      this.container.innerHTML = `
        <div class="sales-goat-sidebar" style="
          position: fixed;
          top: 0;
          right: ${right};
          width: ${width};
          height: 100vh;
          z-index: 999999;
          background: rgba(11, 14, 20, 0.95);
          backdrop-filter: blur(10px);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          transition: right 0.3s, width 0.3s;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        ">
          ${this.renderHeader()}
          ${!this.isCollapsed ? this.renderContent() : ''}
        </div>
      `;

      this.container.style.display = 'block';
      this.attachEventListeners();
    }

    renderHeader() {
      const borderColor = this.state === 'active' 
        ? 'rgba(34, 197, 94, 0.3)' 
        : 'rgba(255, 255, 255, 0.1)';

      return `
        <div style="
          padding: 16px;
          border-bottom: 1px solid ${borderColor};
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
        ">
          ${!this.isCollapsed ? `
            <div style="font-size: 20px">🐐</div>
            <div style="flex: 1; font-size: 16px; font-weight: 600; color: #fff">
              Sales Goat Shadow
            </div>
            <button id="sg-close-btn" style="
              background: none;
              border: none;
              color: #999;
              font-size: 20px;
              cursor: pointer;
              padding: 4px;
              border-radius: 4px;
            ">×</button>
          ` : ''}
          <button id="sg-collapse-btn" style="
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
          ">${this.isCollapsed ? '◀' : '▶'}</button>
        </div>
      `;
    }

    renderContent() {
      return `
        <div style="
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        ">
          ${this.renderLeadContext()}
          ${this.renderTranscript()}
          ${this.renderRebuttal()}
          ${this.renderMetrics()}
        </div>
      `;
    }

    renderLeadContext() {
      if (!this.leadContext) return '';

      return `
        <div class="sg-section">
          <div class="sg-section-title">🛡️ Lead Context</div>
          ${this.leadContext.factFinding ? `
            <div class="sg-context-item">
              <div class="sg-context-label">The Why:</div>
              <div class="sg-context-value">${this.leadContext.factFinding}</div>
            </div>
          ` : ''}
          ${this.leadContext.previousCalls !== undefined ? `
            <div class="sg-context-item">
              <div class="sg-context-label">Previous Calls:</div>
              <div class="sg-context-value">${this.leadContext.previousCalls} calls</div>
            </div>
          ` : ''}
          ${this.leadContext.lastScore !== undefined ? `
            <div class="sg-context-item">
              <div class="sg-context-label">Last Score:</div>
              <div class="sg-context-value">${this.leadContext.lastScore}/100</div>
            </div>
          ` : ''}
        </div>
      `;
    }

    renderTranscript() {
      return `
        <div class="sg-section">
          <div class="sg-section-title">💬 Live Transcript</div>
          <div style="
            fontSize: 13px;
            lineHeight: 1.6;
            color: #ccc;
            maxHeight: 120px;
            overflowY: auto;
            padding: 8px;
            background: rgba(255, 255, 255, 0.03);
            borderRadius: 8px;
          ">
            ${this.transcript || 'Waiting for transcript...'}
          </div>
        </div>
      `;
    }

    renderRebuttal() {
      if (!this.rebuttal) return '';

      return `
        <div class="sg-section">
          <div class="sg-section-title">⚡ Goat Rebuttal</div>
          <div class="sg-rebuttal-text">"${this.rebuttal.text}"</div>
          ${this.rebuttal.context ? `
            <div class="sg-rebuttal-context">Context: ${this.rebuttal.context}</div>
          ` : ''}
        </div>
      `;
    }

    renderMetrics() {
      const certaintyColor = this.certainty >= 75 ? '#22C55E' : 
                            this.certainty >= 50 ? '#EAB308' : '#EF4444';
      const sentimentColor = this.sentiment === 'Frustrated' ? '#EF4444' :
                            this.sentiment === 'Engaged' ? '#22C55E' : '#999';
      const sentimentBg = this.sentiment === 'Frustrated' ? 'rgba(239, 68, 68, 0.2)' :
                         this.sentiment === 'Engaged' ? 'rgba(34, 197, 94, 0.2)' :
                         'rgba(255, 255, 255, 0.1)';

      return `
        <div class="sg-section">
          <div class="sg-section-title">📊 Live Metrics</div>
          <div class="sg-metric">
            <div class="sg-metric-label">Certainty</div>
            <div class="sg-meter">
              <div class="sg-meter-fill" style="
                width: ${this.certainty}%;
                background: ${certaintyColor};
                box-shadow: 0 0 10px ${certaintyColor};
              "></div>
            </div>
            <div class="sg-metric-value" style="color: ${certaintyColor}">
              ${Math.round(this.certainty)}%
            </div>
          </div>
          <div class="sg-metric">
            <div class="sg-metric-label">Lead Sentiment</div>
            <div class="sg-sentiment" style="
              background: ${sentimentBg};
              color: ${sentimentColor};
              ${sentimentColor !== '#999' ? `box-shadow: 0 0 10px ${sentimentColor}40;` : ''}
            ">
              ${this.sentiment}
            </div>
            ${this.sentiment === 'Frustrated' ? `
              <div style="
                fontSize: 12px;
                color: #EF4444;
                marginTop: 8px;
                padding: 8px;
                background: rgba(239, 68, 68, 0.1);
                borderRadius: 6px;
              ">
                ⚠️ Lead is getting frustrated - Pivot to Step 1: Approval
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    attachEventListeners() {
      const closeBtn = this.container?.querySelector('#sg-close-btn');
      const collapseBtn = this.container?.querySelector('#sg-collapse-btn');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hide());
      }

      if (collapseBtn) {
        collapseBtn.addEventListener('click', () => this.toggleCollapse());
      }
    }
  }
})();
