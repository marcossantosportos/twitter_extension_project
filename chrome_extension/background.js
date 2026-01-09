// background.js

console.log("🔄 Background script starting...");

// Keep service worker alive
let keepAliveInterval;

// Fired when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ Twitter Sentiment Extension installed.");

  // Keep the service worker alive
  keepAliveInterval = setInterval(() => {
    console.log("💙 Service worker heartbeat");
  }, 20000); // Every 20 seconds
});

// Fired when service worker starts up
chrome.runtime.onStartup.addListener(() => {
  console.log("🚀 Twitter Sentiment Extension service worker started.");
});

// Listen for messages from popup and relay to content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📩 Background received message:", message);

  if (message.action === "getTweet") {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Error querying tabs:", chrome.runtime.lastError.message);
        sendResponse({ error: "Failed to access active tab" });
        return;
      }

      if (tabs.length === 0) {
        sendResponse({ error: "No active tab found" });
        return;
      }

      const activeTab = tabs[0];
      console.log("📋 Active tab:", activeTab.url);

      // Check if we're on Twitter
      if (!activeTab.url.includes('twitter.com') && !activeTab.url.includes('x.com')) {
        sendResponse({ error: "Please navigate to Twitter/X to use this extension" });
        return;
      }

      // Send message to content script with retry logic
      let retryCount = 0;
      const maxRetries = 3;

      const injectContentScript = (cb) => {
        console.log("🧩 Attempting to inject content script into active tab...");
        chrome.scripting.executeScript(
          {
            target: { tabId: activeTab.id },
            files: ["content.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error("Failed to inject content script:", chrome.runtime.lastError.message);
            } else {
              console.log("✅ Content script injected successfully");
            }
            cb && cb();
          }
        );
      };

      const sendMessageWithRetry = () => {
        chrome.tabs.sendMessage(activeTab.id, { action: "getTweet" }, (response) => {
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message || "";
            console.error("Error sending message to content script:", msg);

            // If the content script isn't present, inject it once then retry
            if (msg.includes("Could not establish connection") || msg.includes("Receiving end does not exist")) {
              if (retryCount < maxRetries) {
                retryCount++;
                injectContentScript(() => setTimeout(sendMessageWithRetry, 500));
                return;
              }
            } else if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retrying message send (attempt ${retryCount}/${maxRetries})`);
              setTimeout(sendMessageWithRetry, 1000);
              return;
            }

            sendResponse({ error: "Failed to communicate with content script after retries" });
            return;
          }

          console.log("📤 Relayed response from content script:", response);
          sendResponse(response);
        });
      };

      sendMessageWithRetry();
    });

    return true; // keeps message channel open for async response
  }
});

// Clean up interval when service worker is about to be terminated
self.addEventListener('beforeunload', () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
});
