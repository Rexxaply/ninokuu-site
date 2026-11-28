// Penghubung ke plugin Android (APK Capacitor). Di browser/PWA semua mengembalikan null.
// APK menyisipkan capacitor.js + skrip plugin (App, Keyboard) ke index.html saat dibangun (workflow apk*.yml);
// plugin buatan sendiri (NinoPip) didaftarkan di sini lewat registerPlugin.
export const isApp = (() => { try { return !!window.Capacitor?.isNativePlatform?.(); } catch { return false; } })();
const cache = new Map();
export function plug(name) {
  if (!isApp) return null;
  if (cache.has(name)) return cache.get(name);
  const C = window.Capacitor; let p = null;
  try { p = C?.Plugins?.[name] || (C?.isPluginAvailable?.(name) ? C.registerPlugin?.(name) : null) || null; } catch { p = null; }
  if (p) cache.set(name, p);
  return p;
}
