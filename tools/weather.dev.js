// weather.dev.js
// Dev-only weather module for Garden OS v4.5 Today plan, Phase 1.
// Not inlined into garden-planner-v4.html yet; that is Phase 3 and gates
// on IMPLEMENTATION_PLAN.md Phase 5B merging first.
//
// Contract:
//   weather.fetchForecast(lat, lon, opts?) -> Promise<WeatherSnapshot | null>
//   weather.isFrostTonight(snapshot, frostThresholdF = 36) -> boolean
//   weather.heatIndexNext24(snapshot) -> number  (Fahrenheit)
//   weather.rainProbNext24(snapshot) -> number   (0..100)
//
// Cache: localStorage key `gardenOS_weather_v1`, 6-hour TTL,
// stale-while-revalidate on subsequent loads.
// Failure contract: no location or fetch failure returns `null` from
// fetchForecast; every caller must handle the null path.

(function (global) {
  "use strict";

  const CACHE_KEY = "gardenOS_weather_v1";
  const TTL_MS = 6 * 60 * 60 * 1000;
  const FORECAST_HOST = "https://api.open-meteo.com/v1/forecast";
  const GEOCODE_HOST = "https://geocoding-api.open-meteo.com/v1/search";

  function nowMs() {
    return Date.now();
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeCache(entry) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (_) {
      // Quota or privacy mode. Ignore.
    }
  }

  function isFresh(entry, now) {
    return entry && entry.fetchedAt && (now - entry.fetchedAt) < TTL_MS;
  }

  function toCelsiusFromFahrenheit(f) {
    return (f - 32) * (5 / 9);
  }
  function toFahrenheitFromCelsius(c) {
    return c * (9 / 5) + 32;
  }

  // Convert an Open-Meteo payload (metric temperatures in C by default)
  // into a snapshot with Fahrenheit on the hourly and daily temperature
  // fields. Garden OS defaults to Fahrenheit thresholds; normalize here.
  function normalizePayload(payload, lat, lon) {
    if (!payload || typeof payload !== "object") return null;
    const daily = payload.daily || {};
    const hourly = payload.hourly || {};
    const tzLabel = payload.timezone || null;

    const dailyOut = {
      time: Array.isArray(daily.time) ? daily.time.slice() : [],
      tMinF: Array.isArray(daily.temperature_2m_min)
        ? daily.temperature_2m_min.map(toFahrenheitFromCelsius)
        : [],
      tMaxF: Array.isArray(daily.temperature_2m_max)
        ? daily.temperature_2m_max.map(toFahrenheitFromCelsius)
        : [],
      rainProb: Array.isArray(daily.precipitation_probability_max)
        ? daily.precipitation_probability_max.slice()
        : [],
    };

    const hourlyOut = {
      time: Array.isArray(hourly.time) ? hourly.time.slice() : [],
      tF: Array.isArray(hourly.temperature_2m)
        ? hourly.temperature_2m.map(toFahrenheitFromCelsius)
        : [],
      rainProb: Array.isArray(hourly.precipitation_probability)
        ? hourly.precipitation_probability.slice()
        : [],
    };

    return {
      schema: "weather-1.0.0",
      lat: lat,
      lon: lon,
      tz: tzLabel,
      fetchedAt: nowMs(),
      daily: dailyOut,
      hourly: hourlyOut,
    };
  }

  function buildForecastUrl(lat, lon) {
    const q = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: "temperature_2m_min,temperature_2m_max,precipitation_probability_max",
      hourly: "temperature_2m,precipitation_probability",
      timezone: "auto",
    });
    return FORECAST_HOST + "?" + q.toString();
  }

  async function fetchForecast(lat, lon, opts) {
    opts = opts || {};
    const force = !!opts.force;
    if (typeof lat !== "number" || typeof lon !== "number") return null;

    const cached = readCache();
    if (!force && isFresh(cached, nowMs()) && cached.lat === lat && cached.lon === lon) {
      return cached;
    }

    try {
      const resp = await fetch(buildForecastUrl(lat, lon), { cache: "no-store" });
      if (!resp.ok) {
        return cached || null; // stale-while-revalidate
      }
      const payload = await resp.json();
      const snap = normalizePayload(payload, lat, lon);
      if (snap) writeCache(snap);
      return snap || cached || null;
    } catch (_) {
      return cached || null; // offline, fall back to stale
    }
  }

  function geocode(query) {
    if (!query || typeof query !== "string") return Promise.resolve(null);
    const q = new URLSearchParams({ name: query, count: "5", language: "en", format: "json" });
    return fetch(GEOCODE_HOST + "?" + q.toString())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.results) || data.results.length === 0) return null;
        const top = data.results[0];
        return {
          lat: top.latitude,
          lon: top.longitude,
          label: [top.name, top.admin1, top.country_code].filter(Boolean).join(", "),
          tz: top.timezone || null,
        };
      })
      .catch(function () { return null; });
  }

  function todayIsoDate(snapshot) {
    // Snapshot daily[0] is today per timezone=auto contract.
    if (!snapshot || !snapshot.daily || !snapshot.daily.time || !snapshot.daily.time.length) return null;
    return snapshot.daily.time[0];
  }

  function isFrostTonight(snapshot, frostThresholdF) {
    const threshold = typeof frostThresholdF === "number" ? frostThresholdF : 36;
    if (!snapshot || !snapshot.daily || !snapshot.daily.tMinF.length) return false;
    return snapshot.daily.tMinF[0] < threshold;
  }

  function heatIndexNext24(snapshot) {
    // Simple: max forecast temperature in the next 24 hourly slots.
    if (!snapshot || !snapshot.hourly || !snapshot.hourly.tF.length) {
      if (snapshot && snapshot.daily && snapshot.daily.tMaxF.length) return snapshot.daily.tMaxF[0];
      return 0;
    }
    const slice = snapshot.hourly.tF.slice(0, 24);
    let max = -Infinity;
    for (const v of slice) if (typeof v === "number" && v > max) max = v;
    return max === -Infinity ? 0 : max;
  }

  function rainProbNext24(snapshot) {
    if (!snapshot || !snapshot.hourly || !snapshot.hourly.rainProb.length) {
      if (snapshot && snapshot.daily && snapshot.daily.rainProb.length) return snapshot.daily.rainProb[0] || 0;
      return 0;
    }
    const slice = snapshot.hourly.rainProb.slice(0, 24);
    let max = 0;
    for (const v of slice) if (typeof v === "number" && v > max) max = v;
    return max;
  }

  function classifyHeatHigh24(snapshot, heatThresholdF) {
    const threshold = typeof heatThresholdF === "number" ? heatThresholdF : 92;
    return heatIndexNext24(snapshot) > threshold;
  }

  const api = {
    CACHE_KEY: CACHE_KEY,
    TTL_MS: TTL_MS,
    fetchForecast: fetchForecast,
    geocode: geocode,
    isFrostTonight: isFrostTonight,
    heatIndexNext24: heatIndexNext24,
    rainProbNext24: rainProbNext24,
    classifyHeatHigh24: classifyHeatHigh24,
    todayIsoDate: todayIsoDate,
    // Exposed for tests that pass pre-fetched payloads.
    normalizePayload: normalizePayload,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  global.gardenWeather = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
