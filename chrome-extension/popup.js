/**
 * Popup Script
 * Controls extension state
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const toggleBtn = document.getElementById('toggle-btn');

  // Check current state
  chrome.storage.local.get(['shadowModeEnabled'], (result) => {
    const isEnabled = result.shadowModeEnabled || false;
    updateUI(isEnabled);
  });

  toggleBtn.addEventListener('click', () => {
    chrome.storage.local.get(['shadowModeEnabled'], (result) => {
      const newState = !result.shadowModeEnabled;
      chrome.storage.local.set({ shadowModeEnabled: newState }, () => {
        updateUI(newState);
        
        // Notify content script
        chrome.tabs.query({ url: 'https://*.aircall.io/*' }, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SHADOW_MODE_TOGGLE',
              enabled: newState,
            });
          });
        });
      });
    });
  });

  function updateUI(isEnabled) {
    if (isEnabled) {
      statusEl.textContent = 'Active';
      statusEl.style.color = '#22C55E';
      toggleBtn.textContent = 'Disable Shadow Mode';
    } else {
      statusEl.textContent = 'Inactive';
      statusEl.style.color = '#999';
      toggleBtn.textContent = 'Enable Shadow Mode';
    }
  }
});
