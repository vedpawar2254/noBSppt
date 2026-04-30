import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { decks } from "@/lib/db/schema";

export const runtime = "nodejs";

// GET /api/og?token=<shareToken> — og:image thumbnail for shared deck (AC3, FR14)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const [deck] = await db
    .select({ title: decks.title, slides: decks.slides })
    .from(decks)
    .where(eq(decks.shareToken, token))
    .limit(1);

  const title = deck?.title ?? "nobsppt";
  const bullets = deck?.slides[0]?.bullets.slice(0, 3) ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          padding: "80px",
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 32,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {bullets.map((bullet, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              fontSize: 28,
              color: "#6B7280",
              marginBottom: 14,
            }}
          >
            <span style={{ color: "#D1D5DB", marginRight: 14 }}>—</span>
            <span>{bullet}</span>
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 80,
            fontSize: 18,
            color: "#D1D5DB",
          }}
        >
          nobsppt
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
