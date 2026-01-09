// Content script loaded
console.log("Twitter Sentiment Extension content script loaded on:", window.location.href);

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

// Also try to find tweets when the page loads or changes
function checkForTweets() {
  const tweetText = getFirstTweet();
  if (tweetText) {
    console.log("Tweet found on page load:", tweetText.substring(0, 100) + "...");
  }
}

// Check for tweets when DOM is ready and after a short delay
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkForTweets);
} else {
  checkForTweets();
}

// Check again after page loads completely
window.addEventListener('load', () => {
  setTimeout(checkForTweets, 2000);
});
