import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { defaultSession, SessionData } from "@/types/session";

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long_for_dev",
  cookieName: "payroll_session",
  cookieOptions: {
    // HTTPS配信が確定するまではfalse固定。"production"ビルド=HTTPSとは限らず、
    // 誤って有効にするとHTTP(LAN内アクセス含む)でCookieが保存されなくなる。
    secure: process.env.COOKIE_SECURE === "true",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export { defaultSession };
