import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, COOKIE_MAX_AGE, PAYER_COOKIE, authToken } from "@/lib/auth-token";

const Body = z.object({
  pin: z.string().min(1),
  payer: z.enum(["A", "J"]),
});

export async function POST(req: Request) {
  const pin = process.env.APP_PIN;
  if (!pin) {
    return NextResponse.json(
      { error: "APP_PIN är inte konfigurerad på servern." },
      { status: 500 },
    );
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  }
  if (parsed.data.pin !== pin) {
    return NextResponse.json({ error: "Fel PIN-kod." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authToken(pin), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  // Payer-cookien är läsbar för klienten så att valet kan bytas utan ny inloggning.
  res.cookies.set(PAYER_COOKIE, parsed.data.payer, {
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
