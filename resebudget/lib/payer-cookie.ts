import { COOKIE_MAX_AGE, PAYER_COOKIE } from "./auth-token";
import { isPayer, type Payer } from "./payer";

// Klientläsbar cookie — payern ska gå att byta i appen utan ny inloggning.

export function readPayerCookie(): Payer {
  if (typeof document === "undefined") return "A";
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${PAYER_COOKIE}=`));
  const value = match?.split("=")[1] ?? "";
  return isPayer(value) ? value : "A";
}

export function writePayerCookie(payer: Payer): void {
  document.cookie = `${PAYER_COOKIE}=${payer}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}
