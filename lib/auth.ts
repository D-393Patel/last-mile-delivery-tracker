import { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";

const COOKIE_NAME = "dispatch_session";
const secretValue = process.env.AUTH_SECRET || (process.env.NODE_ENV === "production" ? "" : "local-development-secret-change-before-deploying");
if (!secretValue) throw new Error("AUTH_SECRET must be configured in production.");
const secret = new TextEncoder().encode(secretValue);

export type Session = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function requireSession(roles?: Role[]) {
  const session = await getSession();
  if (!session) throw new AppError("Authentication required.", 401, "UNAUTHENTICATED");
  if (roles && !roles.includes(session.role)) {
    throw new AppError("You do not have permission for this action.", 403, "FORBIDDEN");
  }
  return session;
}
