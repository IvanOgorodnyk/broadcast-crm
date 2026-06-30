import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { exchangeCodeForTokens, googleEnabled } from "@/lib/integrations/google";

/** GET — OAuth callback. Exchanges the code and stores the refresh token. */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL("/profile?google=disabled", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Defend against the token being attached to the wrong account.
  if (!code || state !== auth.user.id) {
    return NextResponse.redirect(new URL("/profile?google=error", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (tokens.refresh_token) {
      await prisma.user.update({
        where: { id: auth.user.id },
        data: { googleRefreshToken: tokens.refresh_token, googleConnectedAt: new Date() },
      });
    }
    return NextResponse.redirect(new URL("/profile?google=connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/profile?google=error", req.url));
  }
}
