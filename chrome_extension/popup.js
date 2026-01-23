const helplines = {
  "Mumbai": "AASRA: +91-9820466726 / 022-27546669",
  "Delhi": "Snehi: +91-9582216888 | Samaritans: 011-23389090",
  "Chennai": "Sneha Foundation: 044-24640050",
  "Kolkata": "Lifeline Foundation: 033-40447437",
  "Bangalore": "Sumaitri: 080-23655557",
  "Bengaluru": "Sumaitri: 080-23655557",
  "Hyderabad": "Roshni: 040-66202000 / 040-66202001",
  "Pune": "Connecting Trust: 9922001122 / 9922004305",
  "Nagpur": "Snehi Nagpur: 8888817666",
  "National": "Tele MANAS: 14416 / 1-800-891-4416 | KIRAN: 1800-599-0019"
};

const centres = {
  "Mumbai": "Nanavati Max Hospital (Psychiatry Dept), Vile Parle",
  "Delhi": "Institute of Human Behaviour & Allied Sciences (IHBAS), Dilshad Garden",
  "Chennai": "Institute of Mental Health (IMH), Kilpauk",
  "Kolkata": "Antaragram / Antara Society, Kolkata",
  "Bangalore": "NIMHANS",
  "Hyderabad": "Institute of Mental Health, Erragadda",
  "Pune": "Regional Mental Hospital, Yerawada",
  "Nagpur": "Regional Mental Hospital, Nagpur",
  "Urgadur": "Private Clinic (Garden Area, Shimoga, Urgadur) A.G.K commercial, Matthur Main Road, Urgadur, Shivamogga. Timings: ~10:00-14:00 daily.",
  "Bengaluru": "Abhaya Hospital, 17, Dr MH Mari Gowda Road (Hosur Road), Opposite 9th Cross Bus Stop, Wilson Garden, Bengaluru - 560027"
};

// Map city name variants to canonical keys used in helplines/centres
const cityAliases = {
  "shimoga": "Shivamogga",
  "shivamogga": "Shivamogga",
  "urgadur": "Urgadur",
  "bengaluru": "Bengaluru",
  "bangalore": "Bangalore",
};

// Upbeat songs (open a direct YouTube watch URL so it starts playing immediately)
// Note: videoIds are best-effort and can be swapped anytime if you prefer different official uploads.
const calmingSongs = [
  { title: "Happy — Pharrell Williams", videoId: "ZbZSe6N_BXs" },
  { title: "Best Day of My Life — American Authors", videoId: "Y66j_BUCBMY" },
  { title: "Can't Stop the Feeling! — Justin Timberlake", videoId: "ru0K8uYEZWw" },
  { title: "Walking on Sunshine — Katrina & The Waves", videoId: "iPUmE-tne5U" },
  { title: "Uptown Funk — Mark Ronson ft. Bruno Mars", videoId: "OPf0YbXqDm0" },
  { title: "Good Life — OneRepublic", videoId: "jZhQOvvV45w" },
  { title: "Wake Me Up — Avicii", videoId: "IcrbM1l_BoI" },
  { title: "On Top of the World — Imagine Dragons", videoId: "w5tWYmIOWGk" },
  { title: "What Makes You Beautiful — One Direction", videoId: "QJO3ROT-A4E" },
  { title: "Firework — Katy Perry", videoId: "QGJuMBdaqIw" },
  { title: "I Gotta Feeling — The Black Eyed Peas", videoId: "uSD4vsh1zDA" },
  { title: "Sugar — Maroon 5", videoId: "09R8_2nJtjg" },
  { title: "Dancing Queen — ABBA", videoId: "xFrGuyw1V8s" },
  { title: "High Hopes — Panic! At The Disco", videoId: "IPXIgEAGe4U" },
  { title: "Levitating — Dua Lipa", videoId: "TUVcZfQe-Kw" }
];

function normalizeCityName(name) {
  if (!name || typeof name !== "string") return "National";
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  return cityAliases[key] || trimmed;
}

// Copy text to clipboard with visual feedback
async function copyToClipboard(text, buttonElement) {
  try {
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    const originalText = buttonElement.textContent;
    buttonElement.textContent = "Copied!";
    buttonElement.classList.add("copied");
    
    // Reset after 2 seconds
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.classList.remove("copied");
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      buttonElement.textContent = "Copied!";
      buttonElement.classList.add("copied");
      setTimeout(() => {
        buttonElement.textContent = "Copy";
        buttonElement.classList.remove("copied");
      }, 2000);
    } catch (e) {
      console.error("Fallback copy failed:", e);
      buttonElement.textContent = "Copy Failed";
      setTimeout(() => {
        buttonElement.textContent = "Copy";
      }, 2000);
    }
    document.body.removeChild(textArea);
  }
}

async function getCityFromLocation(lat, lng) {
  try {
    let res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    let data = await res.json();
    return data.city || data.locality || "National";
  } catch (err) {
    console.error("Geocoding failed:", err);
    return "National";
  }
}

async function getCityFromIP() {
  // Try multiple anonymous IP-to-city providers to improve reliability
  const providers = [
    async () => {
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) throw new Error(`ipapi error: ${res.status}`);
      const data = await res.json();
      let city = data.city || data.region || "";
      if (!city && data.latitude && data.longitude) {
        city = await getCityFromLocation(data.latitude, data.longitude);
      }
      return city;
    },
    async () => {
      const res = await fetch(
        "https://api.bigdatacloud.net/data/ip-geolocation-with-confidence?localityLanguage=en"
      );
      if (!res.ok) throw new Error(`bigdatacloud IP error: ${res.status}`);
      const data = await res.json();
      return data.city || data.locality || data.principalSubdivision || "";
    }
  ];

  for (const provider of providers) {
    try {
      const city = await provider();
      if (city) {
        return city;
      }
    } catch (err) {
      console.error("IP geolocation provider failed:", err);
    }
  }

  return "National";
}

async function classifyTweet(tweetText) {
  try {
    // Validate tweet text
    if (!tweetText || !tweetText.trim()) {
      return { label: false, error: "empty_tweet", detail: "Tweet text is empty or invalid." };
    }

    let response = await fetch("http://localhost:5000/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: tweetText })
    });

    // Check if response is OK
    if (!response.ok) {
      // Try to get error message from response
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error("Server error response:", response.status, errorData);
      return { label: false, error: "server_error", detail: errorData.error || `Server returned ${response.status}` };
    }

    // Parse JSON for successful responses
    let result = await response.json();
    
    // Check if backend returned an error in the response body
    // (Even with HTTP 200, backend might return { error: ... } in some cases)
    if (result.error) {
      console.error("Backend returned error:", result.error);
      return { label: false, error: "backend_error", detail: result.error };
    }

    // Ensure result has expected structure
    if (!result || typeof result !== 'object') {
      return { label: false, error: "invalid_response", detail: "Invalid response format from server" };
    }

    // Valid response - return as-is
    return result;
    
  } catch (err) {
    console.error("Classification failed:", err);
    // More specific error messages
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return { label: false, error: "connection_failed", detail: "Cannot connect to server. Make sure the backend is running on http://localhost:5000" };
    }
    if (err instanceof SyntaxError) {
      return { label: false, error: "parse_error", detail: "Server returned invalid JSON response" };
    }
    return { label: false, error: "classification_failed", detail: err.message || "Unknown error occurred" };
  }
}

// This function will now run automatically when the popup opens
async function analyzeOnLoad() {
  // Update the UI to show that analysis is in progress
  document.getElementById("result").innerText = "Analyzing tweet...";

  console.log("🔄 Popup sending message to background script...");

  // Chatbot functions - defined at the top level of analyzeOnLoad
  let chatbotSessionId = null;
  let chatbotStep = 0;

  async function startChatbotFlow() {
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotMessages = document.getElementById('chatbot-messages');

    // Show chatbot container
    chatbotContainer.classList.add('active');
    chatbotMessages.innerHTML = '';

    try {
      // Start chat session
      const response = await fetch("http://localhost:5000/start_chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error("Failed to start chat");
      }

      const data = await response.json();
      chatbotSessionId = data.session_id;

      // Display first message
      addChatbotMessage(data.message, 'bot');
      chatbotStep = 0;

      // Wait 2 seconds, then show second message
      setTimeout(async () => {
        await sendChatMessage("", true); // Trigger next step
      }, 2000);

    } catch (err) {
      console.error("Chatbot error:", err);
      addChatbotMessage("Sorry, I'm having trouble connecting. Please try again.", 'bot');
    }
  }

  function addChatbotMessage(text, type) {
    const chatbotMessages = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${type}`;
    messageDiv.textContent = text;
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  async function sendChatMessage(userMessage = "", autoTrigger = false) {
    if (!chatbotSessionId && !autoTrigger) {
      return;
    }

    const chatbotInputContainer = document.getElementById('chatbot-input-container');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotActionButtons = document.getElementById('chatbot-action-buttons');

    try {
      // If user sent a message, display it
      if (userMessage && !autoTrigger) {
        addChatbotMessage(userMessage, 'user');
        chatbotInput.value = '';
      }

      // Send to backend
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: chatbotSessionId,
          message: userMessage || ""
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      chatbotStep++;

      // Handle response
      if (data.waiting_for_input) {
        // Show message and input field
        if (data.message) {
          addChatbotMessage(data.message, 'bot');
        }
        chatbotInputContainer.classList.add('active');
        chatbotInput.focus();
      } else if (data.message) {
        // Display bot message
        addChatbotMessage(data.message, 'bot');
        
        if (data.show_buttons) {
          // Wait 2 seconds, then show buttons
          setTimeout(() => {
            chatbotActionButtons.classList.add('active');
            chatbotInputContainer.classList.remove('active');
          }, data.next_delay || 2000);
        } else if (data.next_delay && chatbotStep < 4) {
          // Continue to next step after delay
          setTimeout(async () => {
            await sendChatMessage("", true);
          }, data.next_delay);
        }
      } else if (data.complete) {
        chatbotInputContainer.classList.remove('active');
      }

    } catch (err) {
      console.error("Chat error:", err);
      addChatbotMessage("Sorry, something went wrong. Please try again.", 'bot');
    }
  }

  // Play a random upbeat song.
  const playRandomSong = (buttonEl) => {
    if (!calmingSongs.length) return;
    const track = calmingSongs[Math.floor(Math.random() * calmingSongs.length)];

    const originalText = buttonEl.textContent;
    buttonEl.textContent = `Opening: ${track.title}`;
    if (track.videoId) {
      // Direct watch URL so YouTube loads the player and starts playback
      globalThis.open(`https://www.youtube.com/watch?v=${track.videoId}&autoplay=1`, "_blank");
    } else {
      // Fallback to search
      const query = encodeURIComponent(track.title);
      globalThis.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
    }
    setTimeout(() => {
      buttonEl.textContent = originalText;
    }, 1500);
  };

  // Message close one function - opens WhatsApp Web
  function messageCloseOne() {
    const emergencyNumber = "9637124027";
    const messageText = encodeURIComponent("This user needs your help. Please reach out to them.");
    
    // Copy number to clipboard
    let copied = false;
    (async () => {
      try {
        await navigator.clipboard.writeText(emergencyNumber);
        copied = true;
      } catch (err) {
        console.warn("Failed to copy to clipboard:", err);
        // Fallback: use execCommand for older browsers
        try {
          const textArea = document.createElement('textarea');
          textArea.value = emergencyNumber;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          copied = true;
        } catch (e) {
          console.warn("Fallback copy also failed:", e);
        }
      }
      
      // Open WhatsApp Web with pre-filled message
      const whatsappUrl = `https://wa.me/${emergencyNumber.replace(/[^0-9]/g, '')}?text=${messageText}`;
      globalThis.open(whatsappUrl, '_blank');
      
      // Show feedback
      showMessageFeedback(emergencyNumber, copied);
    })();
  }

  // Set up chatbot event listeners
  function setupChatbotListeners() {
    const chatbotSendBtn = document.getElementById('chatbot-send-btn');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotMessageBtn = document.getElementById('chatbot-message-btn');
    const chatbotSongBtn = document.getElementById('chatbot-song-btn');

    if (chatbotSendBtn) {
      chatbotSendBtn.addEventListener('click', () => {
        const message = chatbotInput.value.trim();
        if (message) {
          sendChatMessage(message);
        }
      });
    }

    if (chatbotInput) {
      chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const message = chatbotInput.value.trim();
          if (message) {
            sendChatMessage(message);
          }
        }
      });
    }

    if (chatbotMessageBtn) {
      chatbotMessageBtn.addEventListener('click', messageCloseOne);
    }

    if (chatbotSongBtn) {
      chatbotSongBtn.addEventListener('click', () => {
        const songBtn = document.getElementById('chatbot-song-btn');
        playRandomSong(songBtn);
      });
    }
  }

  // ⭐ Call setupChatbotListeners here, after it's defined
  setupChatbotListeners();

  // Helper function to show message feedback
  function showMessageFeedback(number, copied) {
    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;
    
    // Remove any existing feedback
    const existingFeedback = resultDiv.querySelector('.call-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }
    
    const feedback = document.createElement('div');
    feedback.className = 'call-feedback';
    feedback.style.cssText = 'margin-top: 12px; padding: 12px; background-color: #1a1a1a; border: 2px solid #dc3545; border-radius: 8px; font-size: 13px; color: #ffffff; text-align: center;';
    
    let message = '';
    if (copied) {
      message = '<div style="font-weight: bold; margin-bottom: 8px; color: #28a745;">✓ Number copied to clipboard!</div>';
    } else {
      message = '<div style="font-weight: bold; margin-bottom: 8px;">💬 Emergency Contact</div>';
    }
    
    const instructions = `<div style="font-size: 11px; color: #888; margin-top: 8px; line-height: 1.4;">
      WhatsApp Web should have opened in a new tab with a pre-filled message.<br>
      ${copied ? 'Number is also copied to clipboard.' : ''}
    </div>`;
    
    // Set the HTML content first
    feedback.innerHTML = `
      ${message}
      <div style="font-size: 22px; font-weight: bold; margin: 12px 0; color: #1da1f2; letter-spacing: 3px; font-family: monospace;">${number}</div>
      ${instructions}
    `;
    
    // Add a button to open WhatsApp again if needed
    const whatsappLink = document.createElement('a');
    const messageText = encodeURIComponent("This user needs your help. Please reach out to them.");
    whatsappLink.href = `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${messageText}`;
    whatsappLink.target = '_blank';
    whatsappLink.style.cssText = 'display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #25D366; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer;';
    whatsappLink.textContent = '💬 Open WhatsApp Again';
    
    // Add the button to the feedback div
    feedback.appendChild(whatsappLink);
    
    resultDiv.appendChild(feedback);
    
    // Remove feedback after 10 seconds
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 10000);
  }

  // Send message to background script which will relay to content script
  chrome.runtime.sendMessage({ action: "getTweet" }, async (response) => {
    console.log("📨 Popup received response:", response);

    // Check if there's an error (like connection issues)
    if (chrome.runtime.lastError) {
      console.error("Extension error:", chrome.runtime.lastError.message);
      document.getElementById("result").innerText = "Error: Please reload the extension and try again.";
      return;
    }

    // Check if background script returned an error
    if (response && response.error) {
      console.error("Background script error:", response.error);
      document.getElementById("result").innerText = "Error: " + response.error;
      return;
    }

    let tweetText = response?.tweet;
    if (!tweetText) {
      document.getElementById("result").innerText = "No tweet found on this page.";
      return;
    }

    let clf = await classifyTweet(tweetText);
    
    // Helper function to create tweet preview HTML
    const createTweetPreview = (text) => {
      const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const escapedTextForCopy = text.replace(/"/g, '&quot;');
      return `
        <div class="tweet-preview">
          <div class="tweet-preview-header">📝 Analyzed Tweet</div>
          <div class="tweet-preview-text">${escapedText}</div>
          <button class="copy-btn" data-copy-text="${escapedTextForCopy}" style="margin-top: 8px;">Copy Tweet</button>
        </div>
      `;
    };

    if (!clf || clf.label !== true) {
      // Show debug info if available
      const resultDiv = document.getElementById("result");
      if (clf && clf.detail) {
        const top = clf.detail.top_label ? ` (top: ${clf.detail.top_label} @ ${(clf.detail.top_score||0).toFixed(2)})` : "";
        resultDiv.innerHTML = `
          <div>✅ No sign of depression detected${top}.</div>
          ${createTweetPreview(tweetText)}
          <details style="margin-top:8px"><summary>Technical Details</summary><pre style="white-space:pre-wrap; font-size: 11px;">${
            JSON.stringify(clf.detail, null, 2)
          }</pre></details>
        `;
      } else {
        resultDiv.innerHTML = `
          <div>✅ No sign of depression detected.</div>
          ${createTweetPreview(tweetText)}
        `;
      }
      
      // Add click handler for tweet copy button
      const tweetCopyBtn = resultDiv.querySelector('.tweet-preview .copy-btn');
      if (tweetCopyBtn) {
        tweetCopyBtn.addEventListener('click', () => {
          const textToCopy = tweetCopyBtn.getAttribute('data-copy-text');
          copyToClipboard(textToCopy, tweetCopyBtn);
        });
      }
      return;
    }

    // If distress is found, get location and show resources
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        let rawCity = await getCityFromLocation(pos.coords.latitude, pos.coords.longitude);
        const city = normalizeCityName(rawCity);
        let helpline = helplines[city] || helplines["National"];
        let centre = centres[city] || "Please contact national helpline for guidance.";

        const resultDiv = document.getElementById("result");
        const escapedTweet = tweetText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const escapedTweetForCopy = tweetText.replace(/"/g, '&quot;');
        resultDiv.innerHTML = `
          <h4>⚠️ Signs of distress detected</h4>
          <div class="info-row">
            <b>City:</b> ${city}
          </div>
          <div class="info-row">
            <b>Suicide Helpline:</b> ${helpline}
            <button class="copy-btn" data-copy-text="${helpline.replace(/"/g, '&quot;')}">Copy</button>
          </div>
          <div class="info-row">
            <b>Mental Health Centre:</b> ${centre}
            <button class="copy-btn" data-copy-text="${centre.replace(/"/g, '&quot;')}">Copy</button>
          </div>
          <div class="tweet-preview">
            <div class="tweet-preview-header">📝 Analyzed Tweet</div>
            <div class="tweet-preview-text">${escapedTweet}</div>
            <button class="copy-btn" data-copy-text="${escapedTweetForCopy}" style="margin-top: 8px;">Copy Tweet</button>
          </div>
        `;
        
        // Add click handlers for copy buttons
        resultDiv.querySelectorAll('.copy-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const textToCopy = btn.getAttribute('data-copy-text');
            copyToClipboard(textToCopy, btn);
          });
        });

        // Start chatbot flow after showing distress info
        setTimeout(() => {
          startChatbotFlow();
        }, 2500);
      },
      async (err) => { // This is the error callback for when geolocation fails or is denied
        console.error("Geolocation error:", err);
        // Fallback: IP-based city lookup
        const rawCity = await getCityFromIP();
        const city = normalizeCityName(rawCity);
        const helpline = helplines[city] || helplines["National"];
        const centre = centres[city] || "Please contact national helpline for guidance.";
        const resultDiv = document.getElementById("result");
        const escapedTweet = tweetText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const escapedTweetForCopy = tweetText.replace(/"/g, '&quot;');
        resultDiv.innerHTML = `
          <h4>⚠️ Signs of distress detected</h4>
          <div class="info-row">
            <b>City:</b> ${city} (approximate)
          </div>
          <div class="info-row">
            <b>Suicide Helpline:</b> ${helpline}
            <button class="copy-btn" data-copy-text="${helpline.replace(/"/g, '&quot;')}">Copy</button>
          </div>
          <div class="info-row">
            <b>Mental Health Centre:</b> ${centre}
            <button class="copy-btn" data-copy-text="${centre.replace(/"/g, '&quot;')}">Copy</button>
          </div>
          <div class="tweet-preview">
            <div class="tweet-preview-header">📝 Analyzed Tweet</div>
            <div class="tweet-preview-text">${escapedTweet}</div>
            <button class="copy-btn" data-copy-text="${escapedTweetForCopy}" style="margin-top: 8px;">Copy Tweet</button>
          </div>
        `;
        
        // Add click handlers for copy buttons
        resultDiv.querySelectorAll('.copy-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const textToCopy = btn.getAttribute('data-copy-text');
            copyToClipboard(textToCopy, btn);
          });
        });

        // Start chatbot flow after showing distress info
        setTimeout(() => {
          startChatbotFlow();
        }, 2500);
      }
    );
  });
}

// Call the function immediately when the script loads
analyzeOnLoad();