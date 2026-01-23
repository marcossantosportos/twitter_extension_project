// Content script loaded
console.log("Twitter Sentiment Extension content script loaded on:", window.location.href);

// ============================
// SIDEBAR PANEL IMPLEMENTATION
// ============================

// Inject CSS for sidebar
const style = document.createElement('style');
style.textContent = `
  #sentiment-sidebar {
    position: fixed;
    right: 0;
    top: 0;
    width: 320px;
    height: 100vh;
    background-color: #000000;
    border-left: 1px solid #2a2a2a;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    transition: width 0.3s ease;
    box-shadow: -2px 0 8px rgba(0,0,0,0.5);
  }
  #sentiment-sidebar.collapsed {
    width: 60px;
  }
  #sentiment-sidebar-header {
    padding: 12px;
    border-bottom: 1px solid #2a2a2a;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #000000;
  }
  #sentiment-sidebar-title {
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
  }
  #sentiment-sidebar.collapsed #sentiment-sidebar-title {
    display: none;
  }
  #sentiment-sidebar-toggle {
    background: none;
    border: none;
    color: #ffffff;
    cursor: pointer;
    font-size: 20px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  #sentiment-sidebar-toggle:hover {
    background-color: #1a1a1a;
  }
  #sentiment-sidebar-stats {
    padding: 12px;
    border-bottom: 1px solid #2a2a2a;
    background-color: #000000;
  }
  #sentiment-sidebar.collapsed #sentiment-sidebar-stats {
    display: none;
  }
  .sentiment-stat {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
  }
  .sentiment-stat-label {
    color: #888;
  }
  .sentiment-stat-value {
    color: #ffffff;
    font-weight: bold;
  }
  .sentiment-stat-value.safe {
    color: #28a745;
  }
  .sentiment-stat-value.warning {
    color: #ffc107;
  }
  .sentiment-stat-value.critical {
    color: #dc3545;
  }
  #sentiment-sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  #sentiment-sidebar.collapsed #sentiment-sidebar-content {
    display: none;
  }
  .sentiment-tweet-card {
    background-color: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
  }
  .sentiment-tweet-card:hover {
    background-color: #252525;
    border-color: #3a3a3a;
  }
  .sentiment-tweet-card.safe {
    border-left: 3px solid #28a745;
  }
  .sentiment-tweet-card.warning {
    border-left: 3px solid #ffc107;
  }
  .sentiment-tweet-card.critical {
    border-left: 3px solid #dc3545;
  }
  .sentiment-tweet-card.loading {
    border-left: 3px solid #6c757d;
    opacity: 0.7;
  }
  .sentiment-tweet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .sentiment-tweet-status {
    font-size: 18px;
    font-weight: bold;
  }
  .sentiment-tweet-status.safe::before {
    content: "✓";
    color: #28a745;
  }
  .sentiment-tweet-status.warning::before {
    content: "!";
    color: #ffc107;
  }
  .sentiment-tweet-status.critical::before {
    content: "⚠";
    color: #dc3545;
  }
  .sentiment-tweet-status.loading::before {
    content: "...";
    color: #6c757d;
  }
  .sentiment-tweet-confidence {
    font-size: 11px;
    color: #888;
  }
  .sentiment-tweet-preview {
    font-size: 12px;
    color: #ffffff;
    line-height: 1.4;
    margin-bottom: 4px;
    word-wrap: break-word;
  }
  .sentiment-tweet-expanded {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #2a2a2a;
    font-size: 11px;
    color: #888;
  }
  .sentiment-tweet-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }
  .sentiment-action-btn {
    background-color: #1da1f2;
    color: #ffffff;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .sentiment-action-btn:hover {
    background-color: #1a8cd8;
  }
  .sentiment-empty-state {
    text-align: center;
    color: #888;
    padding: 40px 20px;
    font-size: 13px;
  }
`;
document.head.appendChild(style);

// State management
const sidebarState = {
  isCollapsed: false,
  analyzedTweets: new Map(), // tweet text -> analysis result
  tweetElements: new Map(), // tweet element -> tweet data
  stats: {
    safe: 0,
    warning: 0,
    critical: 0,
    total: 0
  },
  analysisQueue: [],
  processingQueue: false,
  maxConcurrent: 3,
  activeRequests: 0
};

// Extract tweet text from a tweet element
function getTweetText(tweetElement) {
  const selectors = [
    '[data-testid="tweetText"]',
    '[data-testid="tweet-text"]',
    'div[data-testid="tweetText"]',
    'article div[lang]'
  ];

  for (let selector of selectors) {
    const textElement = tweetElement.querySelector(selector);
    if (textElement && textElement.innerText && textElement.innerText.trim()) {
      return textElement.innerText.trim();
    }
  }
  return null;
}

// Classify tweet via background script (to bypass CORS)
async function classifyTweet(tweetText) {
  try {
    // Validate tweet text
    if (!tweetText || !tweetText.trim()) {
      return { label: false, error: "empty_tweet", detail: "Tweet text is empty or invalid." };
    }

    // Send message to background script to do the classification
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "classifyTweet", text: tweetText },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
            resolve({ 
              label: false, 
              error: "connection_failed", 
              detail: chrome.runtime.lastError.message 
            });
            return;
          }

          if (response && response.error) {
            resolve(response);
            return;
          }

          resolve(response);
        }
      );
    });
    
  } catch (err) {
    console.error("Classification failed:", err);
    return { 
      label: false, 
      error: "classification_failed", 
      detail: err.message || "Unknown error occurred" 
    };
  }
}

// Create sidebar DOM structure
function createSidebar() {
  // Remove existing sidebar if present
  const existing = document.getElementById('sentiment-sidebar');
  if (existing) {
    existing.remove();
  }

  const sidebar = document.createElement('div');
  sidebar.id = 'sentiment-sidebar';
  
  // Load collapsed state from storage
  chrome.storage.local.get(['sidebarCollapsed'], (result) => {
    if (result.sidebarCollapsed) {
      sidebar.classList.add('collapsed');
      sidebarState.isCollapsed = true;
    }
  });

  sidebar.innerHTML = `
    <div id="sentiment-sidebar-header">
      <div id="sentiment-sidebar-title">Sentiment Analysis</div>
      <button id="sentiment-sidebar-toggle">◀</button>
    </div>
    <div id="sentiment-sidebar-stats">
      <div class="sentiment-stat">
        <span class="sentiment-stat-label">Safe:</span>
        <span class="sentiment-stat-value safe" id="stat-safe">0</span>
      </div>
      <div class="sentiment-stat">
        <span class="sentiment-stat-label">Warning:</span>
        <span class="sentiment-stat-value warning" id="stat-warning">0</span>
      </div>
      <div class="sentiment-stat">
        <span class="sentiment-stat-label">Critical:</span>
        <span class="sentiment-stat-value critical" id="stat-critical">0</span>
      </div>
      <div class="sentiment-stat">
        <span class="sentiment-stat-label">Total:</span>
        <span class="sentiment-stat-value" id="stat-total">0</span>
      </div>
    </div>
    <div id="sentiment-sidebar-content">
      <div class="sentiment-empty-state">Analyzing visible tweets...</div>
    </div>
  `;

  document.body.appendChild(sidebar);

  // Toggle collapse/expand
  const toggleBtn = sidebar.querySelector('#sentiment-sidebar-toggle');
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    sidebarState.isCollapsed = sidebar.classList.contains('collapsed');
    toggleBtn.textContent = sidebarState.isCollapsed ? '▶' : '◀';
    
    // Save state
    chrome.storage.local.set({ sidebarCollapsed: sidebarState.isCollapsed });
  });

  // Event delegation for tweet card clicks
  const content = sidebar.querySelector('#sentiment-sidebar-content');
  if (content) {
    content.addEventListener('click', (e) => {
      // Handle action button clicks
      if (e.target.classList.contains('sentiment-action-btn')) {
        return; // Action buttons handle their own clicks
      }
      
      // Find the clicked tweet card
      const card = e.target.closest('.sentiment-tweet-card');
      if (!card) return;
      
      const tweetTextAttr = card.getAttribute('data-tweet-text');
      if (!tweetTextAttr) return;
      
      // Get result from state
      const cardResult = sidebarState.analyzedTweets.get(tweetTextAttr);
      if (!cardResult) return;
      
      // Toggle expansion
      const isExpanded = card.querySelector('.sentiment-tweet-expanded');
      const cardId = card.id;
      card.outerHTML = createTweetCard(tweetTextAttr, cardResult, !isExpanded);
    });
  }

  return sidebar;
}

// Update stats display
function updateStats() {
  const safeEl = document.getElementById('stat-safe');
  const warningEl = document.getElementById('stat-warning');
  const criticalEl = document.getElementById('stat-critical');
  const totalEl = document.getElementById('stat-total');

  if (safeEl) safeEl.textContent = sidebarState.stats.safe;
  if (warningEl) warningEl.textContent = sidebarState.stats.warning;
  if (criticalEl) criticalEl.textContent = sidebarState.stats.critical;
  if (totalEl) totalEl.textContent = sidebarState.stats.total;
}

// Create tweet card
function createTweetCard(tweetText, result, isExpanded = false) {
  const cardId = `tweet-card-${tweetText.substring(0, 20).replace(/\s/g, '-')}`;
  
  let statusClass = 'safe';
  let statusIcon = 'safe';
  let statusText = 'Safe';
  let confidence = 'N/A';

  let errorMessage = null;

  if (result && result.loading) {
    statusClass = 'loading';
    statusIcon = 'loading';
    statusText = 'Analyzing...';
    confidence = '';
  } else if (result && result.error) {
    statusClass = 'loading';
    statusIcon = 'loading';
    statusText = 'Error';
    errorMessage = result.detail || result.error || 'Unknown error';
  } else if (result && result.label === true) {
    statusClass = 'critical';
    statusIcon = 'critical';
    statusText = 'Critical';
    // FIX: Safely access detail.top_score
    confidence = (result.detail && result.detail.top_score) ? (result.detail.top_score * 100).toFixed(1) + '%' : 'N/A';
  } else if (result && result.detail && result.detail.top_score && result.detail.top_score > 0.45) {
    statusClass = 'warning';
    statusIcon = 'warning';
    statusText = 'Warning';
    confidence = (result.detail.top_score * 100).toFixed(1) + '%';
  } else {
    // Safe tweets
    confidence = (result?.detail?.top_score) ? (result.detail.top_score * 100).toFixed(1) + '%' : 'N/A';
  }

  const preview = tweetText.length > 50 ? tweetText.substring(0, 50) + '...' : tweetText;
  const expandedContent = isExpanded ? `
    <div class="sentiment-tweet-expanded">
      <div><strong>Full Tweet:</strong></div>
      <div style="margin-top: 4px;">${tweetText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      ${errorMessage ? `
        <div style="margin-top: 8px; color: #dc3545;"><strong>Error:</strong> ${errorMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      ` : ''}
      ${result && result.detail && !errorMessage ? `
        <div style="margin-top: 8px;"><strong>Label:</strong> ${result.detail.top_label || 'N/A'}</div>
        <div><strong>Confidence:</strong> ${confidence}</div>
      ` : ''}
      ${statusClass === 'critical' ? `
        <div class="sentiment-tweet-actions">
          <button class="sentiment-action-btn" onclick="window.open('chrome-extension://${chrome.runtime.id}/popup.html', '_blank')">Get Help</button>
        </div>
      ` : ''}
    </div>
  ` : '';

  return `
    <div class="sentiment-tweet-card ${statusClass}" data-tweet-text="${tweetText.replace(/"/g, '&quot;')}" id="${cardId}">
      <div class="sentiment-tweet-header">
        <span class="sentiment-tweet-status ${statusIcon}">${statusText}</span>
        <span class="sentiment-tweet-confidence">${confidence}</span>
      </div>
      <div class="sentiment-tweet-preview">${preview.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      ${expandedContent}
    </div>
  `;
}

// Add tweet card to sidebar
function addTweetCard(tweetText, result) {
  const content = document.getElementById('sentiment-sidebar-content');
  if (!content) return;

  // Remove empty state if present
  const emptyState = content.querySelector('.sentiment-empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  // Check if card already exists
  const cardId = `tweet-card-${tweetText.substring(0, 20).replace(/\s/g, '-')}`;
  let existingCard = document.getElementById(cardId);
  
  if (existingCard) {
    // Update existing card
    existingCard.outerHTML = createTweetCard(tweetText, result, false);
  } else {
    // Add new card at the top
    const cardHTML = createTweetCard(tweetText, result, false);
    content.insertAdjacentHTML('afterbegin', cardHTML);
  }

  // Click handlers are handled via event delegation set up in createSidebar()

  // Update stats
  updateStats();
}

// Process analysis queue
async function processAnalysisQueue() {
  if (sidebarState.processingQueue || sidebarState.analysisQueue.length === 0) {
    return;
  }

  if (sidebarState.activeRequests >= sidebarState.maxConcurrent) {
    return;
  }

  sidebarState.processingQueue = true;

  while (sidebarState.analysisQueue.length > 0 && sidebarState.activeRequests < sidebarState.maxConcurrent) {
    const { tweetText, tweetElement } = sidebarState.analysisQueue.shift();
    
    // Skip if already analyzed
    if (sidebarState.analyzedTweets.has(tweetText)) {
      continue;
    }

    // Show loading card
    addTweetCard(tweetText, { loading: true });

    sidebarState.activeRequests++;
    
    classifyTweet(tweetText).then(result => {
      sidebarState.activeRequests--;
      
      // Store result
      sidebarState.analyzedTweets.set(tweetText, result);
      sidebarState.tweetElements.set(tweetElement, { text: tweetText, result });

      // Update stats
      if (result && result.label === true) {
        sidebarState.stats.critical++;
      } else if (result && result.detail && result.detail.top_score > 0.45) {
        sidebarState.stats.warning++;
      } else {
        sidebarState.stats.safe++;
      }
      sidebarState.stats.total++;

      // Update card with result
      addTweetCard(tweetText, result);

      // Continue processing queue
      sidebarState.processingQueue = false;
      processAnalysisQueue();
    }).catch(err => {
      sidebarState.activeRequests--;
      console.error('Analysis error:', err);
      addTweetCard(tweetText, { error: true });
      sidebarState.processingQueue = false;
      processAnalysisQueue();
    });
  }

  sidebarState.processingQueue = false;
}

// Queue tweet for analysis
function queueTweetForAnalysis(tweetElement) {
  const tweetText = getTweetText(tweetElement);
  if (!tweetText) {
    console.log("❌ No text extracted from tweet element");
    return;
  }

  if (sidebarState.analyzedTweets.has(tweetText)) {
    console.log("⏭️ Tweet already analyzed, skipping");
    return;
  }

  if (sidebarState.analysisQueue.some(item => item.tweetText === tweetText)) {
    console.log("⏭️ Tweet already in queue, skipping");
    return;
  }

  console.log("✅ Queuing tweet for analysis:", tweetText.substring(0, 50) + "...");
  sidebarState.analysisQueue.push({ tweetText, tweetElement });
  processAnalysisQueue();
}

// Collect all visible tweets in the viewport
function collectAllVisibleTweets() {
  const tweetSelectors = [
    'article[data-testid="tweet"]',
    'article[role="article"]'
  ];
  
  const visibleTweets = [];
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  for (let selector of tweetSelectors) {
    document.querySelectorAll(selector).forEach(tweet => {
      const rect = tweet.getBoundingClientRect();
      // Check if tweet is in viewport (with small margin for better detection)
      if (rect.top < viewportHeight + 100 && rect.bottom > -100 && 
          rect.left < viewportWidth + 100 && rect.right > -100) {
        // Only add if we can extract text from it
        if (getTweetText(tweet)) {
          visibleTweets.push(tweet);
        }
      }
    });
  }
  
  // Remove duplicates based on tweet text
  const seenTexts = new Set();
  return visibleTweets.filter(tweet => {
    const text = getTweetText(tweet);
    if (!text || seenTexts.has(text)) {
      return false;
    }
    seenTexts.add(text);
    return true;
  });
}

// Initialize IntersectionObserver for viewport detection
function initViewportObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Tweet entered viewport - queue for analysis
        queueTweetForAnalysis(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '50px', // Start analyzing slightly before tweet enters viewport
    threshold: 0.1
  });

  // Observe all tweet articles
  const observeTweets = () => {
    const tweetSelectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]'
    ];

    for (let selector of tweetSelectors) {
      document.querySelectorAll(selector).forEach(tweet => {
        if (!tweet.hasAttribute('data-sentiment-observed')) {
          tweet.setAttribute('data-sentiment-observed', 'true');
          observer.observe(tweet);
        }
      });
    }
  };

  // Initial observation
  observeTweets();

  // Watch for new tweets (Twitter's infinite scroll)
  const mutationObserver = new MutationObserver(() => {
    observeTweets();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also check periodically (backup)
  setInterval(observeTweets, 2000);
}

// Initialize sidebar when page loads
function initSidebar() {
  // Wait for Twitter to load
  const checkTwitterLoaded = setInterval(() => {
    if (document.querySelector('article[data-testid="tweet"]') || document.body) {
      clearInterval(checkTwitterLoaded);
      createSidebar();
      
      // Analyze all visible tweets on initial load
      setTimeout(() => {
        const visibleTweets = collectAllVisibleTweets();
        console.log(`📊 Found ${visibleTweets.length} visible tweets to analyze`);
        visibleTweets.forEach(tweet => {
          queueTweetForAnalysis(tweet);
        });
      }, 500); // Small delay to ensure sidebar is fully rendered
      
      initViewportObserver();
    }
  }, 500);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkTwitterLoaded);
    createSidebar();
    
    // Analyze all visible tweets on initial load
    setTimeout(() => {
      const visibleTweets = collectAllVisibleTweets();
      console.log(`📊 Found ${visibleTweets.length} visible tweets to analyze`);
      visibleTweets.forEach(tweet => {
        queueTweetForAnalysis(tweet);
      });
    }, 500);
    
    initViewportObserver();
  }, 10000);
}

// ============================
// EXISTING FUNCTIONALITY (for popup compatibility)
// ============================

// Extract the first tweet text
function getFirstTweet() {
  // Try multiple selectors for tweets as Twitter's DOM structure can change
  let selectors = [
    '[data-testid="tweetText"]',
    '[data-testid="tweet-text"]',
    '.tweet-text',
    '[data-testid="cellInnerDiv"] [data-testid="tweetText"]',
    'article div[lang]'
  ];

  for (let selector of selectors) {
    let tweet = document.querySelector(selector);
    if (tweet && tweet.innerText && tweet.innerText.trim()) {
      console.log("Found tweet with selector:", selector);
      return tweet.innerText.trim();
    }
  }

  console.log("No tweet found with any selector");
  return null;
}

// Listen for popup.js request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);

  if (request.action === "getTweet") {
    let tweetText = getFirstTweet();
    console.log("Sending response:", { tweet: tweetText });
    sendResponse({ tweet: tweetText });
  }
});

// Initialize sidebar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebar);
} else {
  initSidebar();
}

// Also initialize on navigation (Twitter SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Reset state on navigation
    sidebarState.analyzedTweets.clear();
    sidebarState.tweetElements.clear();
    sidebarState.analysisQueue = [];
    sidebarState.stats = { safe: 0, warning: 0, critical: 0, total: 0 };
    // Reinitialize sidebar on navigation
    setTimeout(initSidebar, 1000);
  }
}).observe(document, { subtree: true, childList: true });
