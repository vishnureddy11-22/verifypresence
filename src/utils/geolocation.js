import { safeDoc as doc, safeGetDoc as getDoc } from '../services/firestore';
import { db } from '../services/firebase';

export const MAX_DISTANCE_METERS = 500;
const LS_GEO_KEY = 'vp_target_location';

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isCapacitorNative() {
  return !!(window?.Capacitor?.isNativePlatform?.());
}

/**
 * Gets GPS position — tries Capacitor plugin on native, browser API on web.
 * Returns null instead of throwing if unavailable (so we can bypass gracefully).
 */
async function getPositionSafe() {
  try {
    if (isCapacitorNative()) {
      const { Geolocation } = await import('@capacitor/geolocation');

      // Request permission — if denied, return null (don't crash)
      try {
        const perm = await Promise.race([
          Geolocation.requestPermissions(),
          new Promise((_, r) => setTimeout(() => r(new Error('perm timeout')), 5000)),
        ]);
        const granted = perm?.location === 'granted' || perm?.coarseLocation === 'granted';
        if (!granted) {
          console.warn('Location permission not granted — bypassing GPS check');
          return null;
        }
      } catch (permErr) {
        console.warn('Permission request failed:', permErr.message);
        return null;
      }

      // Get position — timeout after 8s, return null on failure
      try {
        const pos = await Promise.race([
          Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 8000 }),
          new Promise((_, r) => setTimeout(() => r(new Error('gps timeout')), 9000)),
        ]);
        return { coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } };
      } catch (posErr) {
        console.warn('GPS position failed:', posErr.message);
        return null;
      }

    } else {
      // Web browser path
      if (!navigator.geolocation) return null;
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => { console.warn('Browser GPS failed:', err.message); resolve(null); },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      });
    }
  } catch (e) {
    console.warn('getPositionSafe error:', e.message);
    return null;
  }
}

async function getTargetCoords() {
  try {
    const cached = localStorage.getItem(LS_GEO_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.latitude && parsed.longitude) return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch (_) {}

  try {
    const snap = await Promise.race([
      getDoc(doc(db, 'settings', 'active_session')),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000)),
    ]);
    if (snap.exists?.() && snap.data().targetLocation) {
      const { latitude, longitude } = snap.data().targetLocation;
      if (latitude && longitude) return { latitude, longitude };
    }
  } catch (_) {}

  return null;
}

/**
 * Validates student location.
 *
 * ✅ PASS conditions:
 *   - No target configured by admin  (bypass)
 *   - GPS unavailable / permission denied  (bypass with warning)
 *   - Student IS within MAX_DISTANCE_METERS  (verified)
 *
 * ❌ FAIL condition:
 *   - GPS works AND target is set AND student is provably OUT of range
 */
export async function validateLocation() {
  const [posResult, targetResult] = await Promise.allSettled([
    getPositionSafe(),
    getTargetCoords(),
  ]);

  const position = posResult.status === 'fulfilled' ? posResult.value : null;
  const target   = targetResult.status === 'fulfilled' ? targetResult.value : null;

  // No target → bypass
  if (!target) {
    return { success: true, distance: 0, bypassed: true };
  }

  // GPS unavailable → bypass with a soft warning (don't block student)
  if (!position) {
    console.warn('GPS unavailable — bypassing geo gate (location unverifiable)');
    return { success: true, distance: 0, bypassed: true, gpsUnavailable: true };
  }

  // Both available — check distance
  const { latitude, longitude } = position.coords;
  const distance = getDistanceInMeters(latitude, longitude, target.latitude, target.longitude);

  if (distance <= MAX_DISTANCE_METERS) {
    return { success: true, distance, coords: { latitude, longitude } };
  }

  return {
    success: false,
    distance,
    coords: { latitude, longitude },
    error: `You are ${Math.round(distance)}m away. Must be within ${MAX_DISTANCE_METERS}m of the campus.`,
  };
}
