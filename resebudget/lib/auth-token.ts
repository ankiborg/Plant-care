// Web Crypto (inte node:crypto) så att samma kod funkar i edge-middleware,
// route handlers och tester.
export const AUTH_COOKIE = "rb_auth";
export const PAYER_COOKIE = "rb_payer";
export const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 dagar

export async function authToken(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`resebudget-v1:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
