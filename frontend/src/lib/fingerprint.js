// Collect browser signals and produce a deterministic fingerprint hash.
// No external libraries — signals are stable across page loads on the same browser/device.

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function collectFingerprint() {
  const tz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
    catch { return ""; }
  })();

  const signals = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    new Date().getTimezoneOffset(),
    tz,
    navigator.hardwareConcurrency ?? "",
    navigator.maxTouchPoints ?? "",
    navigator.platform ?? "",
  ].join("|");

  return "fp_" + djb2(signals);
}
