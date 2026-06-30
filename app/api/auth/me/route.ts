import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  return session ? Response.json({ user: session }) : Response.json({ user: null }, { status: 401 });
}
