// src/app/api/mlabs/instagram/entrar/route.js — manda a la marca a autorizar en Instagram (spec 2026-10-26 §3).
import { cookieState, nuevoState } from "../../../../mlabs/lib/automatizar/sesion.js";
import { urlAutorizacion } from "../../../../mlabs/lib/automatizar/instagram.js";
import { REDIRECT } from "../../../../mlabs/lib/automatizar/deps.js";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.IG_APP_ID) return new Response("Falta IG_APP_ID en Vercel", { status: 500 });
  const state = nuevoState();
  return new Response(null, { status: 302, headers: { Location: urlAutorizacion({ clientId: process.env.IG_APP_ID, redirectUri: REDIRECT, state }), "Set-Cookie": cookieState(state) } });
}
