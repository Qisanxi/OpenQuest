/**
 * Build QuestContext for the LLM prompt.
 *
 * The context is categorical (setting/season/time/weather) plus an
 * optional user-typed place name (capped at 60 chars). We deliberately
 * DO NOT use the user's actual GPS coordinates for prompt-building —
 * the categorical context is enough to give the LLM local flavor
 * without tracking the user's movements.
 *
 * Setting and weather are inferred from the browser:
 *   - Setting: city/suburb/park/countryside — best-effort from POI density
 *   - Weather: from navigator.geolocation + a free weather API, or 'cloudy'
 *   - Season: from current month in the northern hemisphere
 *   - Time of day: from current hour
 *
 * Place name is a free-text input — user can type "Brooklyn" or
 * "near the river" to flavour the quest.
 */

import type { QuestContext, Setting, Season, TimeOfDay, Weather } from '@shared/quest'
import { sanitizePlaceName } from '@shared/quest'

export async function buildContext(userPlace?: string): Promise<QuestContext> {
  const now = new Date()
  const month = now.getMonth() // 0-11

  const season = inferSeason(month)
  const time = inferTimeOfDay(now.getHours())
  const weather = await inferWeather().catch(() => 'cloudy' as Weather)
  const setting = await inferSetting().catch(() => 'city' as Setting)

  return {
    setting,
    season,
    time,
    weather,
    placeName: userPlace ? sanitizePlaceName(userPlace) : undefined,
  }
}

function inferSeason(month: number): Season {
  // Northern hemisphere. TODO: detect hemisphere from geolocation.
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

function inferTimeOfDay(hour: number): TimeOfDay {
  if (hour < 6) return 'dawn'
  if (hour < 11) return 'morning'
  if (hour < 14) return 'midday'
  if (hour < 18) return 'afternoon'
  if (hour < 21) return 'dusk'
  return 'night'
}

/**
 * Use the browser's geolocation + a free weather API to get current weather.
 * Falls back to 'cloudy' if denied or unavailable.
 */
async function inferWeather(): Promise<Weather> {
  if (!('geolocation' in navigator)) return 'cloudy'

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 5000,
      maximumAge: 30 * 60 * 1000,  // 30 min cache
    })
  }).catch(() => null)
  if (!position) return 'cloudy'

  const { latitude, longitude } = position.coords
  // Open-Meteo: free, no API key required
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}&current=weather_code`
  const res = await fetch(url)
  if (!res.ok) return 'cloudy'
  const data = await res.json()
  return mapWeatherCode(data.current?.weather_code ?? 3)
}

function mapWeatherCode(code: number): Weather {
  // WMO weather codes: https://open-meteo.com/en/docs
  if (code === 0) return 'sunny'
  if (code <= 3) return 'cloudy'
  if (code <= 48) return 'foggy'
  if (code <= 67) return 'rainy'
  if (code <= 77) return 'snowy'
  if (code <= 99) return 'stormy'
  return 'cloudy'
}

/**
 * Best-effort setting inference. Looks at the density of POIs in the
 * immediate area — dense = city, sparse = countryside.
 *
 * For the MVP, we just return 'city'. Refining this is a stretch goal.
 */
async function inferSetting(): Promise<Setting> {
  return 'city'
}
