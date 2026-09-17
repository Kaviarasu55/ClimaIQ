# ClimaIQ — Full-Stack AI Weather Dashboard

🔗 **Live Demo:** [https://climaiq-weather.netlify.app/](https://climaiq-weather.netlify.app/)

A weather dashboard that combines real-time data from the OpenWeatherMap API with 5 distinct AI-powered features driven by the Groq LLM API — going beyond raw numbers to give context-aware, human-readable weather insights.

## Features

- **Real-time weather data** — current conditions pulled live from OpenWeatherMap
- **5 Groq LLM-powered AI features**, including natural-language weather summaries and clothing/activity recommendations based on actual live conditions
- **Shared context pipeline** — feeds 12+ live weather fields (temperature, humidity, wind speed, UV index, etc.) into every AI prompt, so responses are specific to the real current weather rather than generic advice
- **Fully mobile-responsive design**
- **Cold-start prevention** via UptimeRobot, keeping the free-tier backend warm so users don't hit slow first-load times

## Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML5, CSS3, JavaScript
- **APIs:** OpenWeatherMap (live weather data), Groq API (LLM-powered features)
- **Deployment:** Netlify (frontend) + Render (backend), with UptimeRobot for backend uptime

## Architecture

```
User → Frontend (Netlify: index.html/script.js/style.css)
          → Backend (Render: app.py, Flask)
              → OpenWeatherMap API (live weather fields)
              → Groq API (LLM features, fed by shared context pipeline)
          ← AI-generated response + weather data
```

The shared context pipeline is the core design idea: rather than sending a bare prompt to the LLM, every request first assembles 12+ live weather fields into a structured context block, which is then injected into each of the 5 AI feature prompts — ensuring responses reflect the actual current conditions instead of generic weather-app boilerplate.

## Setup

```bash
pip install -r requirements.txt
```

Create a `.env` file with your API keys:
```
OPENWEATHER_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

Run the backend:
```bash
python app.py
```

Then open `index.html` in a browser (or serve it via a static server) to use the frontend against your local backend.

## Known Limitations

- Relies on OpenWeatherMap's free-tier API limits — high-traffic use would need a paid tier
- Free-tier Render backend can still experience brief cold-start delays outside UptimeRobot's ping window
-
