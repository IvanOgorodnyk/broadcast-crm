import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { buildGoogleAuthUrl, googleEnabled } from "@/lib/integrations/google";

/** GET — redirect the user into Google's OAuth consent screen. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  if (!googleEnabled()) {
    return NextResponse.json(
      { error: "Google integration is not configured on this server." },
      { status: 503 }
    );
  }
  // State carries the user id so the callback knows who to attach the token to.
  const url = buildGoogleAuthUrl(auth.user.id);
  return NextResponse.redirect(url);
}
