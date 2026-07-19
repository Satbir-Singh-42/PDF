import { NextRequest, NextResponse } from "next/server";
// Native Response used for binary PDF body (NextResponse doesn't accept Buffer/Uint8Array in Next.js 16)
import { generatePdf } from "@/lib/pdf-generator";
import type { PdfOptions } from "@/lib/types";

export const maxDuration = 60; // Vercel Pro: 60s; Hobby: 10s (graceful partial result)
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, options } = body as { url: string; options: PdfOptions };

    // ── Validate URL ───────────────────────────────────────────
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
    }

    const safeUrl = parsedUrl.toString();

    // ── Sanitize options with defaults ─────────────────────────
    const safeOptions: PdfOptions = {
      format: ["A4", "Letter", "fullpage"].includes(options?.format) ? options.format : "A4",
      margins: ["none", "small", "normal"].includes(options?.margins) ? options.margins : "normal",
      maxScrolls: typeof options?.maxScrolls === "number" ? Math.min(options.maxScrolls, 200) : 25,
      scrollDelay: ["fast", "normal", "slow"].includes(options?.scrollDelay) ? options.scrollDelay : "normal",
      includeBackground: options?.includeBackground !== false,
    };

    // ── Generate PDF (streaming progress not possible in standard POST) ──
    // Progress updates are tracked via a shared job map in SSE route for full SSE mode.
    // For simplicity here we return the PDF directly.
    const pdfBuffer = await generatePdf(safeUrl, safeOptions, () => {});

    // ── Return PDF ─────────────────────────────────────────────
    const hostname = parsedUrl.hostname.replace(/\./g, "_");
    const filename = `${hostname}_${Date.now()}.pdf`;

    // Use native Response with ArrayBuffer — Next.js 16 BodyInit accepts ArrayBuffer
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "X-Filename": filename,
        "X-Size-KB": Math.round(pdfBuffer.length / 1024).toString(),
      },
    });
  } catch (err: unknown) {
    console.error("[generate-pdf] Error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
