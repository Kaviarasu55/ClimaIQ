from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

# Fix 4 — .env error handling
if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            line = line.strip()
            if "=" in line:
                key, value = line.split("=", 1)
                os.environ[key] = value
else:
    print("WARNING: .env file not found. Make sure API keys are set.")

API_KEY = os.environ.get("API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
OWM_BASE = "https://api.openweathermap.org/data/2.5"

if not API_KEY:
    print("WARNING: API_KEY not set.")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not set.")


@app.route("/weather")
def get_weather():
    city = request.args.get("city")
    if not city:
        return jsonify({"error": "City name required"}), 400

    # Fix 6 — URL encoding using params
    response = requests.get(f"{OWM_BASE}/weather", params={
        "q": city,
        "appid": API_KEY,
        "units": "metric"
    })
    data = response.json()

    if response.status_code != 200:
        return jsonify({"error": data.get("message", "City not found")}), 404

    return jsonify({
        "city": data["name"],
        "country": data["sys"]["country"],
        "lat": data["coord"]["lat"],
        "lon": data["coord"]["lon"],
        "temp": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "condition": data["weather"][0]["description"],
        "icon": data["weather"][0]["icon"],
        "wind": data["wind"]["speed"],
        "clouds": data["clouds"]["all"]
    })


@app.route("/forecast")
def get_forecast():
    city = request.args.get("city")
    if not city:
        return jsonify({"error": "City name required"}), 400

    # Fix 6 — URL encoding using params
    response = requests.get(f"{OWM_BASE}/forecast", params={
        "q": city,
        "appid": API_KEY,
        "units": "metric",
        "cnt": 6 
    })
    data = response.json()

    if response.status_code != 200:
        return jsonify({"error": data.get("message", "City not found")}), 404

    hours = []
    for item in data["list"]:
        hours.append({
            "time": item["dt_txt"][11:16],
            "temp": item["main"]["temp"],
            "icon": item["weather"][0]["icon"],
            "condition": item["weather"][0]["description"]
        })

    return jsonify(hours)


@app.route("/ai-insight", methods=["POST"])
def ai_insight():
    data = request.get_json()
    if not data or not data.get("prompt"):
        return jsonify({"insight": "No prompt provided."}), 400

    prompt = data.get("prompt")

    if not GROQ_API_KEY:
        return jsonify({"insight": "AI service not configured."}), 500

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    body = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        res = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=body,
            timeout=15
        )
        result = res.json()
        if "choices" not in result:
            print("Groq error:", result)
            return jsonify({"insight": "AI insight unavailable right now."})
        insight = result["choices"][0]["message"]["content"]
        return jsonify({"insight": insight})

    except requests.exceptions.Timeout:
        return jsonify({"insight": "AI request timed out. Please try again."}), 504
    except Exception as e:
        print("AI error:", e)
        return jsonify({"insight": "AI insight unavailable right now."}), 500


if __name__ == "__main__":
    app.run(debug=False)