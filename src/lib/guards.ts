import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "./auth";

/** Use inside API routes. Returns the session or a 401 response. */
export async function requireUser(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const user = await getSession();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

export async function requireAdmin(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const res = await requireUser();
  if ("error" in res) return res;
  if (res.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return res;
}
