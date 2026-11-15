// Can this device show the 3D map? If not, the map stays 2D (the pixel drawing), which always works.
// No three.js here: WorldMap imports this file, and three.js only loads when 3D is really used.
//
// 3D is used when the browser has WebGL without a big slow-down (no graphics chip means software
// drawing, which would be too slow, so those devices keep the 2D map).
// For testing, the address can force it: ?3d=off always shows 2D, ?3d=on tries 3D anyway.

let cached = null;

function urlChoice() {
  try {
    const value = new URLSearchParams(window.location.search).get('3d');
    return value === 'on' || value === 'off' ? value : null;
  } catch {
    return null;
  }
}

function hasWebGL(strict) {
  try {
    const canvas = document.createElement('canvas');
    const options = strict ? { failIfMajorPerformanceCaveat: true } : undefined;
    const gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options);
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // give the test context back straight away
    return true;
  } catch {
    return false;
  }
}

export function canUse3D() {
  if (cached !== null) return cached;
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  // Test runners pretend to be a browser but cannot draw: keep the 2D map there.
  if (/jsdom|happydom/i.test(window.navigator?.userAgent ?? '')) return false;
  const choice = urlChoice();
  if (choice === 'off') cached = false;
  else cached = hasWebGL(choice !== 'on');
  return cached;
}
