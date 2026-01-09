# Twitter Sentiment Extension

A Chrome extension that analyzes tweets for mental health distress signals using a machine learning model.

## Project Structure

- **`chrome_extension/`** - Chrome extension files (manifest, background script, content script, popup)
- **`Backend/`** - Flask server with sentiment analysis model

## Prerequisites

- **Python 3.10+** (virtual environment already set up in `Backend/sentinel/`)
- **Google Chrome** or **Microsoft Edge** (Chromium-based browser)
- All Python dependencies are already installed in the virtual environment

## How to Run

### Step 1: Start the Backend Server

1. Open a terminal/PowerShell window
2. Navigate to the Backend directory:
   ```powershell
   cd Backend
   ```

3. Activate the virtual environment:
   ```powershell
   .\sentinel\Scripts\Activate.ps1
   ```
   (If you get an execution policy error, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)

4. Start the Flask server:
   ```powershell
   python server.py
   ```

5. Wait for the model to load. You should see:
   - `✅ Model 'dsuram/distilbert-mentalhealth-classifier' loaded successfully.`
   - `* Running on http://0.0.0.0:5000`

   **Keep this terminal window open** - the server must be running for the extension to work.

### Step 2: Load the Chrome Extension

1. Open **Google Chrome** or **Microsoft Edge**
2. Navigate to the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

3. Enable **Developer mode** (toggle in the top-right corner)

4. Click **"Load unpacked"** or **"Load extension"**

5. Select the `chrome_extension` folder:
   ```
   C:\Users\Marc\OneDrive\Documents\twitter_extension_project\chrome_extension
   ```

6. The extension should now appear in your extensions list

### Step 3: Use the Extension

1. Navigate to **Twitter** (`twitter.com`) or **X** (`x.com`)
2. Click the extension icon in your browser toolbar
3. The extension will analyze the current tweet and display sentiment results

## Troubleshooting

### Backend Server Issues

- **Port 5000 already in use**: Change the port in `server.py` (line 144) and update `manifest.json` (line 13) to match
- **Model loading fails**: Check your internet connection - the model downloads from Hugging Face on first run
- **GPU not detected**: The extension works on CPU, but will be slower

### Extension Issues

- **Extension not working**: Make sure the backend server is running on `http://localhost:5000`
- **"Could not establish connection"**: 
  - Verify the server is running
  - Check that `manifest.json` has the correct `host_permissions` for `http://localhost:5000/*`
- **Content script not injecting**: 
  - Make sure you're on `twitter.com` or `x.com`
  - Try refreshing the page
  - Check the browser console (F12) for errors

### Check if Everything is Working

1. **Backend**: Open `http://localhost:5000/classify` in your browser (should show an error, but confirms server is running)
2. **Extension**: 
   - Open browser DevTools (F12)
   - Go to the "Console" tab
   - Look for extension-related logs
   - Check the "Service Worker" link in `chrome://extensions/` for background script logs

## Development Notes

- The extension uses **Manifest V3**
- The backend uses **Flask** with **CORS** enabled
- The sentiment model is `dsuram/distilbert-mentalhealth-classifier` from Hugging Face
- The extension communicates with the backend via HTTP POST requests to `/classify`




