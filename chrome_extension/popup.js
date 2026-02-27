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

const cityAliases = {
  "shimoga": "Shivamogga",
  "shivamogga": "Shivamogga",
  "urgadur": "Urgadur",
  "bengaluru": "Bengaluru",
  "bangalore": "Bangalore",
};

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

async function copyToClipboard(text, buttonElement) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = buttonElement.textContent;
    buttonElement.textContent = "Copied!";
    buttonElement.classList.add("copied");
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.classList.remove("copied");
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
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
      if (city) return city;
    } catch (err) {
      console.error("IP geolocation provider failed:", err);
    }
  }

  return "National";
}

async function classifyTweet(tweetText) {
  try {
    if (!tweetText || !tweetText.trim()) {
      return { label: false, error: "empty_tweet", detail: "Tweet text is empty or invalid." };
    }

    let response = await fetch("http://localhost:5000/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: tweetText })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error("Server error response:", response.status, errorData);
      return { label: false, error: "server_error", detail: errorData.error || `Server returned ${response.status}` };
    }

    let result = await response.json();

    if (result.error) {
      console.error("Backend returned error:", result.error);
      return { label: false, error: "backend_error", detail: result.error };
    }

    if (!result || typeof result !== 'object') {
      return { label: false, error: "invalid_response", detail: "Invalid response format from server" };
    }

    return result;

  } catch (err) {
    console.error("Classification failed:", err);
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
  document.getElementById("result").innerText = "Analyzing tweet...";
  console.log("🔄 Popup opening...");

  // Chatbot functions
  let chatbotSessionId = null;
  let chatbotStep = 0;

  async function startChatbotFlow() {
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotMessages = document.getElementById('chatbot-messages');

    chatbotContainer.classList.add('active');
    chatbotMessages.innerHTML = '';

    try {
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

      addChatbotMessage(data.message, 'bot');
      chatbotStep = 0;

      setTimeout(async () => {
        await sendChatMessage("", true);
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
    if (!chatbotSessionId && !autoTrigger) return;

    const chatbotInputContainer = document.getElementById('chatbot-input-container');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotActionButtons = document.getElementById('chatbot-action-buttons');

    try {
      if (userMessage && !autoTrigger) {
        addChatbotMessage(userMessage, 'user');
        chatbotInput.value = '';
      }

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

      if (data.waiting_for_input) {
        if (data.message) addChatbotMessage(data.message, 'bot');
        chatbotInputContainer.classList.add('active');
        chatbotInput.focus();
      } else if (data.message) {
        addChatbotMessage(data.message, 'bot');

        if (data.show_buttons) {
          setTimeout(() => {
            chatbotActionButtons.classList.add('active');
            chatbotInputContainer.classList.remove('active');
          }, data.next_delay || 2000);
        } else if (data.next_delay && chatbotStep < 4) {
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

  const playRandomSong = (buttonEl) => {
    if (!calmingSongs.length) return;
    const track = calmingSongs[Math.floor(Math.random() * calmingSongs.length)];
    const originalText = buttonEl.textContent;
    buttonEl.textContent = `Opening: ${track.title}`;
    if (track.videoId) {
      globalThis.open(`https://www.youtube.com/watch?v=${track.videoId}&autoplay=1`, "_blank");
    } else {
      const query = encodeURIComponent(track.title);
      globalThis.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
    }
    setTimeout(() => {
      buttonEl.textContent = originalText;
    }, 1500);
  };

  function messageCloseOne() {
    // ── All 3 emergency numbers to contact simultaneously ──
    const emergencyNumbers = ["9637124027", "8888862588", "9823758251"];
    const messageText = encodeURIComponent("This user needs your help. Please reach out to them.");
    let copied = false;

    (async () => {
      // Copy all numbers to clipboard as a comma-separated list
      const allNumbersText = emergencyNumbers.join(', ');
      try {
        await navigator.clipboard.writeText(allNumbersText);
        copied = true;
      } catch (err) {
        console.warn("Failed to copy to clipboard:", err);
        try {
          const textArea = document.createElement('textarea');
          textArea.value = allNumbersText;
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

      // Open a separate WhatsApp tab for each number with a 1-second gap
      // between each so the browser does not block simultaneous window.open calls
      emergencyNumbers.forEach((number, index) => {
        setTimeout(() => {
          const whatsappUrl = `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${messageText}`;
          globalThis.open(whatsappUrl, '_blank');
        }, index * 1000);
      });

      // Show feedback panel listing all numbers
      showMessageFeedback(emergencyNumbers, copied);
    })();
  }

  let resourcesData = null;

  async function loadResources() {
    try {
      const response = await fetch("http://localhost:5000/resources", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (response.ok) {
        const data = await response.json();
        resourcesData = data;
        console.log("✅ Resources loaded from backend");
        return data;
      }
    } catch (err) {
      console.log("⚠️ Backend resources unavailable, using bundled JSON");
    }

    try {
      const response = await fetch(chrome.runtime.getURL('resources.json'));
      const data = await response.json();
      resourcesData = data;
      console.log("✅ Resources loaded from bundled JSON");
      return data;
    } catch (err) {
      console.error("❌ Failed to load resources:", err);
      return null;
    }
  }

  function renderResources(resources) {
    const resourcesContent = document.getElementById('resources-content');
    if (!resourcesContent || !resources || !resources.categories) {
      if (resourcesContent) {
        resourcesContent.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">No resources available.</div>';
      }
      return;
    }

    let html = '';
    resources.categories.forEach(category => {
      html += `<div class="resources-category">`;
      html += `<div class="resources-category-title">${category.title}</div>`;
      category.items.forEach(item => {
        const kindLabel = item.kind === 'article' ? '📄 Article' :
                         item.kind === 'video' ? '🎥 Video' :
                         '📝 Exercise';
        html += `<div class="resource-item">`;
        html += `<div class="resource-item-title">${item.title}</div>`;
        html += `<div class="resource-item-summary">${item.summary || ''}</div>`;
        html += `<span class="resource-item-kind">${kindLabel}</span>`;
        html += `<button class="resource-open-btn" data-url="${item.url.replace(/"/g, '&quot;')}">Open</button>`;
        html += `</div>`;
      });
      html += `</div>`;
    });

    resourcesContent.innerHTML = html;

    // Attach click listeners after innerHTML is set (CSP-safe, no inline handlers)
    resourcesContent.querySelectorAll('.resource-open-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (url) {
          chrome.tabs.create({ url: url });
        }
      });
    });
  }

  function showResourcesView() {
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInputContainer = document.getElementById('chatbot-input-container');
    const chatbotActionButtons = document.getElementById('chatbot-action-buttons');
    const resourcesView = document.getElementById('chatbot-resources-view');

    if (chatbotMessages) chatbotMessages.style.display = 'none';
    if (chatbotInputContainer) {
      chatbotInputContainer.classList.remove('active');
      chatbotInputContainer.style.display = 'none';
    }
    if (chatbotActionButtons) {
      chatbotActionButtons.classList.remove('active');
      chatbotActionButtons.style.display = 'none';
    }

    if (resourcesView) {
      resourcesView.classList.add('active');
      if (!resourcesData) {
        loadResources().then(data => {
          if (data) renderResources(data);
        });
      } else {
        renderResources(resourcesData);
      }
    }
  }

  function showChatView() {
    const chatbotMessages = document.getElementById('chatbot-messages');
    const resourcesView = document.getElementById('chatbot-resources-view');

    if (chatbotMessages) chatbotMessages.style.display = 'block';
    if (resourcesView) resourcesView.classList.remove('active');
  }

  function setupChatbotListeners() {
    const chatbotSendBtn = document.getElementById('chatbot-send-btn');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotMessageBtn = document.getElementById('chatbot-message-btn');
    const chatbotSongBtn = document.getElementById('chatbot-song-btn');
    const chatbotResourcesBtn = document.getElementById('chatbot-resources-btn');
    const resourcesBackBtn = document.getElementById('resources-back-btn');

    if (chatbotSendBtn) {
      chatbotSendBtn.addEventListener('click', () => {
        const message = chatbotInput.value.trim();
        if (message) sendChatMessage(message);
      });
    }

    if (chatbotInput) {
      chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const message = chatbotInput.value.trim();
          if (message) sendChatMessage(message);
        }
      });
    }

    if (chatbotMessageBtn) {
      chatbotMessageBtn.addEventListener('click', messageCloseOne);
    }

    if (chatbotSongBtn) {
      chatbotSongBtn.addEventListener('click', () => {
        playRandomSong(document.getElementById('chatbot-song-btn'));
      });
    }

    if (chatbotResourcesBtn) {
      chatbotResourcesBtn.addEventListener('click', showResourcesView);
    }

    if (resourcesBackBtn) {
      resourcesBackBtn.addEventListener('click', showChatView);
    }
  }

  setupChatbotListeners();

  // Updated to accept an array of numbers instead of a single number string
  function showMessageFeedback(numbers, copied) {
    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;

    const existingFeedback = resultDiv.querySelector('.call-feedback');
    if (existingFeedback) existingFeedback.remove();

    const feedback = document.createElement('div');
    feedback.className = 'call-feedback';
    feedback.style.cssText = 'margin-top: 12px; padding: 12px; background-color: #1a1a1a; border: 2px solid #dc3545; border-radius: 8px; font-size: 13px; color: #ffffff; text-align: center;';

    const headerMsg = copied
      ? '<div style="font-weight: bold; margin-bottom: 8px; color: #28a745;">✓ Numbers copied to clipboard!</div>'
      : '<div style="font-weight: bold; margin-bottom: 8px;">💬 Emergency Contacts</div>';

    // Render each number on its own line
    const numbersDisplay = numbers.map(n =>
      `<div style="font-size: 18px; font-weight: bold; margin: 6px 0; color: #1da1f2; letter-spacing: 2px; font-family: monospace;">${n}</div>`
    ).join('');

    const instructions = `<div style="font-size: 11px; color: #888; margin-top: 8px; line-height: 1.4;">
      WhatsApp is opening for each contact with a pre-filled message.<br>
      ${copied ? 'All numbers are also copied to clipboard.' : ''}
    </div>`;

    feedback.innerHTML = `
      ${headerMsg}
      <div style="margin: 10px 0;">${numbersDisplay}</div>
      ${instructions}
    `;

    // "Re-open All" button in case any tab was blocked by the browser
    const messageText = encodeURIComponent("This user needs your help. Please reach out to them.");
    const reopenBtn = document.createElement('button');
    reopenBtn.textContent = '💬 Re-open All WhatsApp Chats';
    reopenBtn.style.cssText = 'display: block; width: 100%; margin-top: 10px; padding: 10px 16px; background-color: #25D366; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;';
    reopenBtn.addEventListener('click', () => {
      numbers.forEach((number, index) => {
        setTimeout(() => {
          const whatsappUrl = `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${messageText}`;
          globalThis.open(whatsappUrl, '_blank');
        }, index * 1000);
      });
    });
    feedback.appendChild(reopenBtn);

    resultDiv.appendChild(feedback);

    // Auto-remove after 15 seconds (slightly longer since there are 3 contacts)
    setTimeout(() => {
      if (feedback.parentNode) feedback.parentNode.removeChild(feedback);
    }, 15000);
  }

  async function triggerDistressFlow(tweetText) {
    const renderDistressUI = (city, helpline, centre, tweetText, approximate = false) => {
      const resultDiv = document.getElementById("result");
      const escapedTweet = tweetText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const escapedTweetForCopy = tweetText.replace(/"/g, '&quot;');

      resultDiv.innerHTML = `
        <h4>⚠️ Signs of distress detected</h4>
        <div class="info-row">
          <b>City:</b> ${city}${approximate ? ' (approximate)' : ''}
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

      resultDiv.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          copyToClipboard(btn.getAttribute('data-copy-text'), btn);
        });
      });

      setTimeout(() => startChatbotFlow(), 2500);
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const rawCity = await getCityFromLocation(pos.coords.latitude, pos.coords.longitude);
        const city = normalizeCityName(rawCity);
        const helpline = helplines[city] || helplines["National"];
        const centre = centres[city] || "Please contact national helpline for guidance.";
        renderDistressUI(city, helpline, centre, tweetText, false);
      },
      async (err) => {
        console.error("Geolocation error:", err);
        const rawCity = await getCityFromIP();
        const city = normalizeCityName(rawCity);
        const helpline = helplines[city] || helplines["National"];
        const centre = centres[city] || "Please contact national helpline for guidance.";
        renderDistressUI(city, helpline, centre, tweetText, true);
      }
    );
  }

  chrome.storage.local.get(['injectedTweet', 'injectedTweetTimestamp'], async (stored) => {
    const isRecent = stored.injectedTweetTimestamp &&
                     (Date.now() - stored.injectedTweetTimestamp < 30000);

    if (stored.injectedTweet && isRecent) {
      console.log("✅ Found injected tweet from sidebar Get Help button");
      chrome.storage.local.remove(['injectedTweet', 'injectedTweetTimestamp']);
      const tweetText = stored.injectedTweet;
      await triggerDistressFlow(tweetText);

    } else {
      console.log("🔄 Popup sending message to background script...");

      chrome.runtime.sendMessage({ action: "getTweet" }, async (response) => {
        console.log("📨 Popup received response:", response);

        if (chrome.runtime.lastError) {
          console.error("Extension error:", chrome.runtime.lastError.message);
          document.getElementById("result").innerText = "Error: Please reload the extension and try again.";
          return;
        }

        if (response && response.error) {
          console.error("Background script error:", response.error);
          document.getElementById("result").innerText = "Error: " + response.error;
          return;
        }

        const tweetText = response?.tweet;
        if (!tweetText) {
          document.getElementById("result").innerText = "No tweet found on this page.";
          return;
        }

        const clf = await classifyTweet(tweetText);

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
          const resultDiv = document.getElementById("result");
          if (clf && clf.detail) {
            const top = clf.detail.top_label
              ? ` (top: ${clf.detail.top_label} @ ${(clf.detail.top_score || 0).toFixed(2)})`
              : "";
            resultDiv.innerHTML = `
              <div>✅ No sign of depression detected${top}.</div>
              ${createTweetPreview(tweetText)}
              <details style="margin-top:8px"><summary>Technical Details</summary>
                <pre style="white-space:pre-wrap; font-size: 11px;">${JSON.stringify(clf.detail, null, 2)}</pre>
              </details>
            `;
          } else {
            resultDiv.innerHTML = `
              <div>✅ No sign of depression detected.</div>
              ${createTweetPreview(tweetText)}
            `;
          }

          const tweetCopyBtn = resultDiv.querySelector('.tweet-preview .copy-btn');
          if (tweetCopyBtn) {
            tweetCopyBtn.addEventListener('click', () => {
              copyToClipboard(tweetCopyBtn.getAttribute('data-copy-text'), tweetCopyBtn);
            });
          }
          return;
        }

        // Distress detected — use shared distress flow
        await triggerDistressFlow(tweetText);
      });
    }
  });
}

// Call the function immediately when the script loads
analyzeOnLoad();
