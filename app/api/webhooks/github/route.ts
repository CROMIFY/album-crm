import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isValidSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  return expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (secret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!isValidSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  }

  const event = request.headers.get("x-github-event");
  if (event !== "push") {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const payload = JSON.parse(rawBody);
  const supabase = createAdminClient();
  const { error } = await supabase.from("notification_log").insert({
    event_type: "github_push",
    payload: {
      repository: payload.repository?.full_name,
      ref: payload.ref,
      pusher: payload.pusher?.name,
      commits: (payload.commits ?? []).map((c: { message: string }) => c.message),
      compare_url: payload.compare,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
