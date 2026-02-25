// background.js

console.log("🔄 Background script starting...");

// Keep service worker alive
let keepAliveInterval;

// ============================
// FIX 1: Extract keepAlive setup into a reusable function so it runs
// on BOTH onInstalled AND onStartup. Previously keepAliveInterval was
// only set inside onInstalled, meaning a service worker restart (which
// fires onStartup, not onInstalled) would never start the heartbeat.
// ============================
function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  keepAliveInterval = setInterval(() => {
    console.log("💙 Service worker heartbeat");
  }, 20000);
}

// Fired when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ Twitter Sentiment Extension installed.");
  startKeepAlive();
});

// Fired when service worker starts up after being terminated
chrome.runtime.onStartup.addListener(() => {
  console.log("🚀 Twitter Sentiment Extension service worker started.");
  // FIX 1 (continued): Also start heartbeat on startup, not just on install
  startKeepAlive();
});

// Notification click handlers - open popup when user interacts
if (chrome.notifications) {
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    // FIX 2: chrome.action.openPopup() returns a Promise in MV3 — use .catch()
    // instead of try/catch, which doesn't catch Promise rejections
    chrome.action.openPopup().catch((e) => {
      console.error("Failed to open popup from notification button:", e);
    });
    chrome.notifications.clear(notificationId);
  });

  chrome.notifications.onClicked.addListener((notificationId) => {
    // FIX 2 (continued): Same Promise-based error handling
    chrome.action.openPopup().catch((e) => {
      console.error("Failed to open popup from notification click:", e);
    });
    chrome.notifications.clear(notificationId);
  });
}

// Listen for messages from popup/content and relay to appropriate handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📩 Background received message:", message);

  // Show browser notification for critical distress
  if (message.action === "showDistressNotification") {
    const options = {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon48.png"),
      title: "Mental Health Support Available",
      message: "We detected signs of distress. Click to get help.",
      buttons: [{ title: "Get Help" }],
      priority: 2
    };

    if (chrome.notifications) {
      chrome.notifications.create(options, (notificationId) => {
        console.log("✅ Distress notification shown:", notificationId);
      });
    }

    sendResponse({ success: true });
    return true;
  }

  // Handle openPopup request from content script "Get Help" button
  // FIX 2 (continued): chrome.action.openPopup() is async — use .then/.catch
  if (message.action === "openPopup") {
    chrome.action.openPopup()
      .then(() => {
        console.log("✅ Popup opened successfully via openPopup message");
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error("Failed to open popup:", err);
        sendResponse({ success: false, error: err?.message || String(err) });
      });
    return true; // Keep message channel open for async response
  }

  // Handle classification requests from content script
  if (message.action === "classifyTweet") {
    const tweetText = message.text;

    if (!tweetText || !tweetText.trim()) {
      sendResponse({
        label: false,
        error: "empty_tweet",
        detail: "Tweet text is empty or invalid."
      });
      return false;
    }

    fetch("http://localhost:5000/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: tweetText })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`
          }));
        }
        return response.json();
      })
      .then(result => {
        if (result.error) {
          console.error("Backend returned error:", result.error);
          sendResponse({
            label: false,
            error: "backend_error",
            detail: result.error
          });
        } else {
          sendResponse(result);
        }
      })
      .catch(err => {
        console.error("Classification failed:", err);
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          sendResponse({
            label: false,
            error: "connection_failed",
            detail: "Cannot connect to server. Make sure the backend is running on http://localhost:5000"
          });
        } else {
          sendResponse({
            label: false,
            error: "classification_failed",
            detail: err.message || "Unknown error occurred"
          });
        }
      });

    return true;
  }

  // Handle chatbot requests from popup
  if (message.action === "chatbotMessage") {
    const { endpoint, data } = message;

    fetch(`http://localhost:5000/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`
          }));
        }
        return response.json();
      })
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        console.error("Chatbot request failed:", err);
        sendResponse({
          error: "connection_failed",
          detail: "Cannot connect to server. Make sure the backend is running on http://localhost:5000"
        });
      });

    return true;
  }

  // Handle getTweet request from popup
  if (message.action === "getTweet") {
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

      if (!activeTab.url.includes('twitter.com') && !activeTab.url.includes('x.com')) {
        sendResponse({ error: "Please navigate to Twitter/X to use this extension" });
        return;
      }

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

    return true;
  }
});

// FIX 3: Removed self.addEventListener('beforeunload') — this event does NOT
// fire in MV3 service workers. It was a no-op and gave false confidence that
// cleanup was happening. The keepAliveInterval is managed by the JS runtime
// and will be cleaned up automatically when the service worker terminates.