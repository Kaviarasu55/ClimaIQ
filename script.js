// ─── Config ───────────────────────────────────────────────
const BASE_URL = "https://climaiq.onrender.com";

// ─── Page Switching ───────────────────────────────────────
const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const target = item.dataset.page;

    navItems.forEach((n) => n.classList.remove("active"));
    item.classList.add("active");

    pages.forEach((p) => p.classList.add("hidden"));
    document.getElementById(`page-${target}`).classList.remove("hidden");

    updateCityTags();
    if (target === "vibe" && currentWeatherData) fetchVibe();
  });
});

// ─── Shared State ─────────────────────────────────────────
let currentWeatherData = null;
let currentCity = null;
let currentProfession = null;

function updateCityTags() {
  const tag = currentCity ? `📍 ${currentCity}` : "No city searched yet";
  const ids = [
    "plannerCityTag",
    "chatCityTag",
    "vibeCityTag",
    "packingCityTag",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = tag;
  });
}

// ─── Dashboard ────────────────────────────────────────────
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const professionInput = document.getElementById("professionInput");

let searchTimeout = null;
function triggerSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const city = cityInput.value.trim();
    if (!city) return;
    currentCity = city;
    currentProfession = professionInput.value.trim();
    fetchAll(city);
  }, 300);
}

searchBtn.addEventListener("click", triggerSearch);
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") triggerSearch();
});
professionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") triggerSearch();
});

async function fetchAll(city) {
  await fetchWeather(city);
  await fetchForecast(city);
}

function getWindDirection(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function formatTime(unix) {
  return new Date(unix * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchWeather(city) {
  try {
    const res = await fetch(
      `${BASE_URL}/weather?city=${encodeURIComponent(city)}`,
    );
    const data = await res.json();

    if (data.error) {
      document.getElementById("errorText").textContent = data.error;
      document.getElementById("errorMsg").classList.remove("hidden");
      document.getElementById("dashboardContent").classList.add("hidden");
      return;
    }

    currentWeatherData = data;
    updateCityTags();

    document.getElementById("errorMsg").classList.add("hidden");
    document.getElementById("cityName").textContent =
      `${data.city}, ${data.country}`;
    document.getElementById("temperature").textContent = `${data.temp}°C`;
    document.getElementById("condition").textContent = data.condition;
    document.getElementById("weatherIcon").src =
      `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
    document.getElementById("humidity").textContent = `${data.humidity}%`;
    document.getElementById("wind").textContent = `${data.wind} m/s`;
    document.getElementById("feelsLike").textContent = `${data.feels_like}°C`;
    document.getElementById("clouds").textContent = `${data.clouds}%`;

    document.getElementById("dashboardContent").classList.remove("hidden");

    if (currentProfession) fetchAI(data, currentProfession);
  } catch (err) {
    document.getElementById("errorText").textContent =
      "Can't connect to server.";
    document.getElementById("errorMsg").classList.remove("hidden");
  }
}

async function fetchForecast(city) {
  try {
    const res = await fetch(
      `${BASE_URL}/forecast?city=${encodeURIComponent(city)}`,
    );
    const data = await res.json();

    const forecastRow = document.getElementById("forecastRow");
    forecastRow.innerHTML = "";

    data.forEach((hour) => {
      forecastRow.innerHTML += `
        <div class="forecast-card">
          <p class="f-time">${hour.time}</p>
          <img src="https://openweathermap.org/img/wn/${hour.icon}.png" />
          <p>${hour.condition}</p>
          <p class="f-temp">${hour.temp}°C</p>
        </div>
      `;
    });
  } catch (err) {
    console.error("Forecast error:", err);
  }
}

function buildWeatherContext(d) {
  return `
City: ${d.city}, ${d.country}
Temperature: ${d.temp}°C (Min: ${d.temp_min}°C, Max: ${d.temp_max}°C)
Feels Like: ${d.feels_like}°C
Condition: ${d.condition}
Humidity: ${d.humidity}%
Pressure: ${d.pressure} hPa
Wind Speed: ${d.wind} m/s, Direction: ${getWindDirection(d.wind_deg)} (${d.wind_deg}°)
Cloud Cover: ${d.clouds}%
Visibility: ${(d.visibility / 1000).toFixed(1)} km
Sunrise: ${formatTime(d.sunrise)}, Sunset: ${formatTime(d.sunset)}
`.trim();
}

async function fetchAI(weatherData, profession) {
  document.getElementById("aiText").textContent =
    "Analyzing weather for your profession...";

  const prompt = `
You are a weather analyst AI.
${buildWeatherContext(weatherData)}
User Profession: ${profession}

Give a short, practical 3-4 line weather insight specifically for this person's profession.
Be specific, helpful, and direct. No generic advice.
`;

  try {
    const res = await fetch(`${BASE_URL}/ai-insight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    document.getElementById("aiText").textContent = data.insight;
  } catch (err) {
    document.getElementById("aiText").textContent =
      "AI insight unavailable right now.";
  }
}

// ─── Activity Planner ─────────────────────────────────────
document
  .getElementById("plannerBtn")
  .addEventListener("click", () => runPlanner());
document.getElementById("plannerTime").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runPlanner();
});

function calculateConfidence(weather, activityType) {
  let score = 100;
  if (weather.temp > 38) score -= 25;
  else if (weather.temp > 35) score -= 15;
  else if (weather.temp > 30) score -= 8;
  if (weather.humidity > 85) score -= 20;
  else if (weather.humidity > 65) score -= 10;
  if (weather.wind > 15) score -= 20;
  else if (weather.wind > 10) score -= 10;
  if (weather.condition.includes("storm")) score -= 35;
  else if (weather.condition.includes("rain")) score -= 25;
  else if (weather.condition.includes("drizzle")) score -= 15;
  else if (weather.condition.includes("fog")) score -= 10;
  if (weather.clouds > 80) score -= 5;
  if (activityType === "outdoor_physical") score -= 10;
  else if (activityType === "outdoor_nonphysical") score -= 5;
  else if (activityType === "indoor") score += 10;
  return Math.max(10, Math.min(100, score));
}

async function runPlanner() {
  const city = currentCity;
  const activity = document.getElementById("plannerActivity").value.trim();
  const time = document.getElementById("plannerTime").value.trim();

  if (!city) {
    alert("Please search a city on Dashboard first!");
    return;
  }
  if (!activity) return;

  document.getElementById("plannerResult").classList.remove("hidden");
  document.getElementById("plannerText").textContent =
    "Analyzing conditions for your activity...";
  document.getElementById("confidenceScore").textContent = "...";

  let forecastData = [];
  try {
    const forecastRes = await fetch(
      `${BASE_URL}/forecast?city=${encodeURIComponent(city)}`,
    );
    forecastData = await forecastRes.json();
  } catch {}

  const forecastSummary = forecastData
    .map((f) => `${f.time}: ${f.temp}°C, ${f.condition}`)
    .join("\n");

  const prompt = `
You are an AI weather activity planner.
${buildWeatherContext(currentWeatherData)}
Activity: "${activity}"
Planned Time: "${time || "not specified"}"

Available forecast slots:
${forecastSummary}

Based on the forecast slot closest to the planned time, reply in this exact format:
ACTIVITY_TYPE: [outdoor_physical / outdoor_nonphysical / indoor]
CONFIDENCE: [0-100 number only, based on forecast weather for that slot]
BEST TIME: [specific time suggestion]
TIPS: [2-3 practical tips]
`;

  try {
    const res = await fetch(`${BASE_URL}/ai-insight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    const text = data.insight;

    const activityTypeMatch = text.match(/ACTIVITY_TYPE:\s*(.+)/);
    const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/);
    const bestTimeMatch = text.match(/BEST TIME:\s*(.+)/);
    const tipsMatch = text.match(/TIPS:\s*([\s\S]+)/);

    const activityType = activityTypeMatch
      ? activityTypeMatch[1].trim()
      : "outdoor_physical";
    const aiScore = confidenceMatch ? parseInt(confidenceMatch[1]) : null;
    const score =
      aiScore !== null
        ? aiScore
        : calculateConfidence(currentWeatherData, activityType);
    const bestTime = bestTimeMatch ? bestTimeMatch[1].trim() : "";
    const tips = tipsMatch ? tipsMatch[1].trim() : text;

    document.getElementById("confidenceScore").textContent = `${score}%`;
    document.getElementById("confidenceFill").style.width = `${score}%`;
    document.getElementById("plannerText").textContent =
      `Best Time: ${bestTime}\n\n${tips}`;
  } catch (err) {
    document.getElementById("plannerText").textContent =
      "Could not analyze activity right now.";
  }
}

// ─── Packing List ─────────────────────────────────────────
document.getElementById("packingBtn").addEventListener("click", async () => {
  const destination =
    document.getElementById("packingDestination").value.trim() || currentCity;
  const duration = document.getElementById("packingDuration").value.trim();
  const purpose = document.getElementById("packingPurpose")?.value.trim() || "";

  if (!destination) {
    alert("Please search a city on Dashboard first!");
    return;
  }

  document.getElementById("packingResult").classList.remove("hidden");
  document.getElementById("packingText").textContent =
    "Generating packing list...";

  const prompt = `
You are a smart travel packing assistant.
Destination: ${destination}
Trip Duration: ${duration || "not specified"}
Purpose: ${purpose || "general travel"}
${currentWeatherData ? buildWeatherContext(currentWeatherData) : "Weather: unknown"}

Generate a practical packing list for this trip based on the weather.
Be specific and concise. Format as a simple list with categories.
`;

  try {
    const res = await fetch(`${BASE_URL}/ai-insight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    document.getElementById("packingText").innerHTML = data.insight
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  } catch (err) {
    document.getElementById("packingText").textContent =
      "Could not generate packing list right now.";
  }
});

// ─── Weather Chat ─────────────────────────────────────────
document
  .getElementById("chatSendBtn")
  .addEventListener("click", () => sendChat());
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

let chatHistory = [];

async function sendChat() {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;

  input.value = "";

  const messages = document.getElementById("chatMessages");
  messages.innerHTML += `<div class="chat-msg user"><p>${msg}</p></div>`;
  messages.innerHTML += `<div class="chat-msg bot" id="botTyping"><p>Thinking...</p></div>`;
  messages.scrollTop = messages.scrollHeight;

  const weatherContext = currentWeatherData
    ? buildWeatherContext(currentWeatherData)
    : "No city searched yet.";

  chatHistory.push({ role: "user", content: msg });

  const fullPrompt = `
You are a friendly weather assistant.
${weatherContext}
User Profession: ${currentProfession || "not specified"}

Conversation so far:
${chatHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}

Reply helpfully in 2-3 sentences. Be specific to the weather data.
`;

  try {
    const res = await fetch(`${BASE_URL}/ai-insight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt }),
    });
    const data = await res.json();

    chatHistory.push({ role: "assistant", content: data.insight });

    document.getElementById("botTyping").outerHTML =
      `<div class="chat-msg bot"><p>${data.insight}</p></div>`;
    messages.scrollTop = messages.scrollHeight;
  } catch (err) {
    document.getElementById("botTyping").outerHTML =
      `<div class="chat-msg bot"><p>Sorry, I couldn't respond right now.</p></div>`;
  }
}

// ─── Weather Vibe ─────────────────────────────────────────
async function fetchVibe() {
  if (!currentWeatherData) return;

  const d = currentWeatherData;

  let mood = "😊 Pleasant";
  let moodDesc = "Comfortable conditions today.";

  if (d.temp > 38) {
    mood = "🥵 Scorching";
    moodDesc = "Extreme heat — stay hydrated and avoid direct sun.";
  } else if (d.temp > 32) {
    mood = "😓 Hot & Humid";
    moodDesc = "Feels heavy outside. Light clothing recommended.";
  } else if (d.temp > 25) {
    mood = "😊 Warm & Nice";
    moodDesc = "Great weather for outdoor activities!";
  } else if (d.temp > 18) {
    mood = "🌤 Cool & Fresh";
    moodDesc = "Pleasant temperature. Perfect for a walk.";
  } else if (d.temp > 10) {
    mood = "🧥 Chilly";
    moodDesc = "Layer up before heading out.";
  } else {
    mood = "🥶 Cold";
    moodDesc = "Bundle up well today!";
  }

  if (d.condition.includes("rain")) {
    mood = "🌧 Rainy Vibes";
    moodDesc = "Cozy indoor weather. Carry an umbrella if going out.";
  }
  if (d.condition.includes("storm")) {
    mood = "⛈ Stormy";
    moodDesc = "Stay indoors if possible. Severe weather alert.";
  }

  document.getElementById("moodValue").textContent = mood;
  document.getElementById("moodDesc").textContent = moodDesc;

  const prompt = `
You are a weather lifestyle assistant.
${buildWeatherContext(d)}
User Profession: ${currentProfession || "general"}

Reply in this exact format:
CLOTHING: [one line clothing recommendation]
SUMMARY: [2-3 sentence friendly daily weather summary like a morning briefing]
`;

  document.getElementById("clothingText").textContent = "Analyzing...";
  document.getElementById("summaryText").textContent = "Generating summary...";

  try {
    const res = await fetch(`${BASE_URL}/ai-insight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    const text = data.insight;

    const clothingMatch = text.match(/CLOTHING:\s*(.+)/);
    const summaryMatch = text.match(/SUMMARY:\s*([\s\S]+)/);

    document.getElementById("clothingText").textContent = clothingMatch
      ? clothingMatch[1].trim()
      : text;
    document.getElementById("summaryText").textContent = summaryMatch
      ? summaryMatch[1].trim()
      : "";
  } catch (err) {
    document.getElementById("clothingText").textContent =
      "Unavailable right now.";
    document.getElementById("summaryText").textContent =
      "Unavailable right now.";
  }
}

// Auto-center active nav item
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", function () {
    this.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  });
});
