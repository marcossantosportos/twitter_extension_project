import torch
import re
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline

# ============================
# Step 1: Initialize Flask App and CORS
# ============================
# Initialize the Flask application
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) to allow the extension to call the server
CORS(app)

print("Starting Flask server and loading the model...")

# Session storage for chatbot conversations
chatbot_sessions = {}

# ============================
# Step 2: Load Model and Create Pipeline (Done once on startup)
# ============================
try:
    # Specify the model from Hugging Face Hub
    model_name = "dsuram/distilbert-mentalhealth-classifier"

    # Check for GPU availability
    device = 0 if torch.cuda.is_available() else -1
    if device == 0:
        print("✅ GPU found. Using GPU for inference.")
    else:
        print("⚠️ No GPU found. Using CPU for inference. This might be slower.")

    # Create the text-classification pipeline
    classifier = pipeline(
        "text-classification",
        model=model_name,
        tokenizer=model_name,
        device=device
    )
    print(f"✅ Model '{model_name}' loaded successfully.")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    classifier = None

# ============================
# Step 3: Chatbot Endpoints
# ============================
@app.route("/start_chat", methods=["POST"])
def start_chat():
    """Initialize a new chatbot session"""
    try:
        session_id = str(uuid.uuid4())
        chatbot_sessions[session_id] = {
            "state": "greeting",
            "step": 0
        }
        return jsonify({
            "session_id": session_id,
            "message": "Hey, I'm here with you.",
            "next_step": "ask_whats_on_mind"
        })
    except Exception as e:
        print(f"Error starting chat: {e}")
        return jsonify({"error": "Failed to start chat"}), 500

@app.route("/chat", methods=["POST"])
def chat():
    """Handle chatbot conversation"""
    try:
        data = request.get_json()
        session_id = data.get("session_id")
        _ = data.get("message", "").strip()  # User message (tracked for state)
        
        if not session_id or session_id not in chatbot_sessions:
            return jsonify({"error": "Invalid session"}), 400
        
        session = chatbot_sessions[session_id]
        state = session["state"]
        step = session["step"]
        
        # Scripted flow implementation
        if state == "greeting" or step == 0:
            # After greeting, ask what's on mind
            session["state"] = "waiting_for_input"
            session["step"] = 1
            return jsonify({
                "message": "What's been on your mind lately?",
                "waiting_for_input": True
            })
        
        elif state == "waiting_for_input" or step == 1:
            # User responded, show reassurance
            session["state"] = "reassurance"
            session["step"] = 2
            return jsonify({
                "message": "You don't need to have everything figured out",
                "next_delay": 2000
            })
        
        elif state == "reassurance" or step == 2:
            # Show final message
            session["state"] = "final"
            session["step"] = 3
            return jsonify({
                "message": "Sometimes a small connection or a little burst of music can make moments like this feel lighter.",
                "next_delay": 2000,
                "show_buttons": True
            })
        
        elif state == "final" or step == 3:
            # Conversation complete
            return jsonify({
                "message": "",
                "complete": True
            })
        
        return jsonify({"error": "Unknown state"}), 400
        
    except Exception as e:
        print(f"Error in chat: {e}")
        return jsonify({"error": "Failed to process chat"}), 500

# ============================
# Step 4: Create the API Endpoint for Classification
# ============================
@app.route("/classify", methods=["POST"])
def classify_text():
    """
    Receives text from the Chrome extension, classifies it,
    and returns a JSON response.
    """
    # Ensure the model was loaded correctly
    if not classifier:
        return jsonify({"error": "Model is not available"}), 500

    # Get the JSON data from the request body
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Invalid request: 'text' field is required."}), 400

    tweet_text = data["text"]
    if not tweet_text.strip():
        return jsonify({"label": False, "detail": "Input text is empty."})

    try:
        # Ask for scores for all labels for robustness across models
        # returns [[{label: str, score: float}, ...]] for a single text
        prediction_all = classifier(tweet_text, truncation=True, return_all_scores=True)

        # Fallback: if pipeline returned a flat list
        scores_list = prediction_all[0] if isinstance(prediction_all, list) and len(prediction_all) > 0 and isinstance(prediction_all[0], list) else prediction_all

        # Build a simple map of label -> score
        label_to_score = {}
        try:
            for item in scores_list:
                label_to_score[str(item.get('label'))] = float(item.get('score'))
        except Exception:
            label_to_score = {}

        # Heuristics to find a distress probability across different label schemes
        # Consider broader distress keywords, not just 'depress'
        distress_keywords = [
    'depress', 'suicid', 'self-harm', 'self harm', 'selfharm', 'selfinjur', 'self injur',
    'crisis', 'harm', 'ideation', 'hopeless',
    'anxiety', 'panic', 'fear', 'worry', 'nervous',
    'trauma', 'flashback', 'nightmare', 'abuse',
    'anorexia', 'bulimia', 'binge', 'purge', 'eating disorder',
    'lonely', 'isolation', 'withdrawn', 'alienated',
    'worthless', 'failure', 'guilt', 'shame', 'regret',
    'rage', 'violent', 'aggressive',
    'alcohol', 'drug', 'addict', 'overdose',
    'despair', 'helpless', 'overwhelmed', 'burnout', 'stress']


        distress_score = None
        for lbl, sc in label_to_score.items():
            lower_lbl = lbl.lower()
            if any(kw in lower_lbl for kw in distress_keywords):
                distress_score = sc if distress_score is None else max(distress_score, sc)

        # 2) Common binary labels as fallback
        if distress_score is None:
            if 'LABEL_1' in label_to_score:
                distress_score = label_to_score['LABEL_1']
            elif 'LABEL_0' in label_to_score and 'LABEL_1' in label_to_score:
                distress_score = label_to_score['LABEL_1']

        # 3) If still None, pick the highest score and set distress if its label hints depression
        top_label = None
        top_score = None
        if not label_to_score:
            # As a last resort, run default pipeline call
            fallback = classifier(tweet_text, truncation=True)
            top_label = str(fallback[0].get('label'))
            top_score = float(fallback[0].get('score', 0.0))
        else:
            top_label, top_score = max(label_to_score.items(), key=lambda kv: kv[1])

        # Decision threshold (tunable)
        threshold = 0.75
        is_distress = False

        if distress_score is not None:
            is_distress = distress_score >= threshold
        else:
            # Use top label name as hint
            lower_top = str(top_label).lower() if top_label is not None else ''
            is_distress = (any(kw in lower_top for kw in distress_keywords)) and (float(top_score) >= threshold)

        # Return detailed response for debugging on frontend
        return jsonify({
            "label": bool(is_distress),
            "detail": {
                "threshold": threshold,
                "top_label": top_label,
                "top_score": top_score,
                "label_scores": label_to_score,
            }
        })

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": "Failed to process the request."}), 500

# ============================
# Step 5: Run the Flask Server
# ============================
if __name__ == "__main__":
    # Run the app on localhost at port 5000
    # The host '0.0.0.0' makes it accessible on your local network
    app.run(host="0.0.0.0", port=5000, debug=True)