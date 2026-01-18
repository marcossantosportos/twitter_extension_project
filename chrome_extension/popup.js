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

// Calming songs (open links only; no streaming here)
const calmingSongs = [
  { title: "Happy — Pharrell Williams", url: "https://www.youtube.com/results?search_query=Happy+Pharrell+Williams" },
  { title: "Best Day of My Life — American Authors", url: "https://www.youtube.com/results?search_query=Best+Day+of+My+Life+American+Authors" },
  { title: "Can't Stop the Feeling! — Justin Timberlake", url: "https://www.youtube.com/results?search_query=Can%27t+Stop+the+Feeling+Justin+Timberlake" },
  { title: "Walking on Sunshine — Katrina & The Waves", url: "https://www.youtube.com/results?search_query=Walking+on+Sunshine+Katrina+The+Waves" },
  { title: "Uptown Funk — Bruno Mars & Mark Ronson", url: "https://www.youtube.com/results?search_query=Uptown+Funk+Bruno+Mars+Mark+Ronson" },
  { title: "Good Life — OneRepublic", url: "https://www.youtube.com/results?search_query=Good+Life+OneRepublic" },
  { title: "Wake Me Up — Avicii", url: "https://www.youtube.com/results?search_query=Wake+Me+Up+Avicii" },
  { title: "On Top of the World — Imagine Dragons", url: "https://www.youtube.com/results?search_query=On+Top+of+the+World+Imagine+Dragons" },
  { title: "What Makes You Beautiful — One Direction", url: "https://www.youtube.com/results?search_query=What+Makes+You+Beautiful+One+Direction" },
  { title: "Firework — Katy Perry", url: "https://www.youtube.com/results?search_query=Firework+Katy+Perry" },
  { title: "I Gotta Feeling — The Black Eyed Peas", url: "https://www.youtube.com/results?search_query=I+Gotta+Feeling+The+Black+Eyed+Peas" },
  { title: "Sugar — Maroon 5", url: "https://www.youtube.com/results?search_query=Sugar+Maroon+5" },
  { title: "Dancing Queen — ABBA", url: "https://www.youtube.com/results?search_query=Dancing+Queen+ABBA" },
  { title: "High Hopes — Panic! At The Disco", url: "https://www.youtube.com/results?search_query=High+Hopes+Panic+At+The+Disco" },
  { title: "Levitating — Dua Lipa", url: "https://www.youtube.com/results?search_query=Levitating+Dua+Lipa" }
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
    
    // Play (open) a random calming song link
    const playRandomSong = (buttonEl) => {
      if (!calmingSongs.length) return;
      const track = calmingSongs[Math.floor(Math.random() * calmingSongs.length)];
      const originalText = buttonEl.textContent;
      buttonEl.textContent = `Opening: ${track.title}`;
      window.open(track.url, "_blank");
      setTimeout(() => {
        buttonEl.textContent = originalText;
      }, 1500);
    };

    // Chatbot prompt function
    function showChatbotPrompt(resultDiv) {
      const chatbotHTML = `
        <div id="chatbot-section">
          <div class="chatbot-message">
            💬 <strong>Support Assistant:</strong> I noticed this thread is getting a bit heavy. Want to take a 2-minute breather with some calm music?
          </div>
          <div class="chatbot-buttons">
            <button id="chatbot-yes" class="chatbot-btn chatbot-btn-yes">Yes</button>
            <button id="chatbot-no" class="chatbot-btn chatbot-btn-no">No, thanks</button>
          </div>
        </div>
      `;
      
      resultDiv.insertAdjacentHTML('beforeend', chatbotHTML);
      
      // Handle Yes button
      document.getElementById('chatbot-yes').addEventListener('click', () => {
        playCalmingMusic();
        const chatbotSection = document.getElementById('chatbot-section');
        chatbotSection.innerHTML = `
          <div style="color: #28a745; font-size: 13px; text-align: center; padding: 8px;">
            ✓ Opening calming music for you...
          </div>
        `;
      });
      
      // Handle No button
      document.getElementById('chatbot-no').addEventListener('click', () => {
        const chatbotSection = document.getElementById('chatbot-section');
        chatbotSection.style.display = 'none';
      });
    }

    // Play calming music using YouTube embed
    function playCalmingMusic() {
      const musicPlayer = document.getElementById('music-player');
      const youtubePlayer = document.getElementById('youtube-player');
      
      if (!musicPlayer || !youtubePlayer) return;
      
      // Use a calming YouTube video (Lofi Hip Hop - 24/7 live stream)
      const videoId = "jfKfPfyJRdk"; // Lofi Hip Hop Radio
      youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
      musicPlayer.style.display = 'block';
      
      // Scroll to music player
      musicPlayer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Call close one function
    function callCloseOne() {
      const emergencyNumber = "8208022049";
      
      // Try tel: protocol
      window.location.href = `tel:${emergencyNumber}`;
      
      // Fallback: If tel: doesn't work (desktop), show alert after delay
      setTimeout(() => {
        // Check if we're still on the same page (tel: didn't navigate away)
        if (document.getElementById('result')) {
          alert(`If the call didn't start, please dial: ${emergencyNumber}`);
        }
      }, 1000);
    }

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
          <button class="call-btn" id="call-close-one">📞 Call Close One</button>
          <button class="song-btn" id="play-song-btn">Play an upbeat song</button>
        `;
        
        // Add click handlers for copy buttons
        resultDiv.querySelectorAll('.copy-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const textToCopy = btn.getAttribute('data-copy-text');
            copyToClipboard(textToCopy, btn);
          });
        });

        // Call Close One button handler
        const callBtn = resultDiv.querySelector('#call-close-one');
        if (callBtn) {
          callBtn.addEventListener('click', callCloseOne);
        }

        // Song button handler
        const songBtn = resultDiv.querySelector('#play-song-btn');
        if (songBtn) {
          songBtn.addEventListener('click', () => playRandomSong(songBtn));
        }

        // Show chatbot after 2.5 second delay
        setTimeout(() => {
          showChatbotPrompt(resultDiv);
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
          <button class="call-btn" id="call-close-one">📞 Call Close One</button>
          <button class="song-btn" id="play-song-btn">Play an upbeat song</button>
        `;
        
        // Add click handlers for copy buttons
        resultDiv.querySelectorAll('.copy-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const textToCopy = btn.getAttribute('data-copy-text');
            copyToClipboard(textToCopy, btn);
          });
        });

        // Call Close One button handler
        const callBtn = resultDiv.querySelector('#call-close-one');
        if (callBtn) {
          callBtn.addEventListener('click', callCloseOne);
        }

        // Song button handler
        const songBtn = resultDiv.querySelector('#play-song-btn');
        if (songBtn) {
          songBtn.addEventListener('click', () => playRandomSong(songBtn));
        }

        // Show chatbot after 2.5 second delay
        setTimeout(() => {
          showChatbotPrompt(resultDiv);
        }, 2500);
      }
    );
  });
}

// Call the function immediately when the script loads
analyzeOnLoad();