import PDFDocument from "pdfkit";
import type { SlideObject } from "@/lib/db/schema";

// Page: 1190 × 669 (widescreen 16:9 at 96 dpi)
const PAGE_W = 1190;
const PAGE_H = 669;
const PAD_X = 80;
const PAD_Y = 100;

const COLORS = {
  title: "#111827",    // gray-900
  bullet: "#374151",   // gray-700
  dot: "#D1D5DB",      // gray-300
  bg: "#FFFFFF",
};

/**
 * Generates a PDF buffer from deck slides.
 * Each slide = one page, styled to match the DeckViewer default theme.
 *
 * Story 5.3 (export error diagnosis) reads these slide counts and latency.
 */
export function generateDeckPdf(
  deckTitle: string,
  slides: SlideObject[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_W, PAGE_H],
      margin: 0,
      autoFirstPage: false,
      info: { Title: deckTitle, Creator: "nobsppt" },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (const slide of slides) {
      doc.addPage();

      // White background
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(COLORS.bg);

      // Slide title
      doc
        .font("Helvetica-Bold")
        .fontSize(36)
        .fillColor(COLORS.title)
        .text(slide.title, PAD_X, PAD_Y, {
          width: PAGE_W - PAD_X * 2,
          lineGap: 4,
        });

      // Bullets
      let bulletY = PAD_Y + 80;
      for (const bullet of slide.bullets) {
        // Dash bullet dot
        doc
          .font("Helvetica")
          .fontSize(20)
          .fillColor(COLORS.dot)
          .text("—", PAD_X, bulletY, { continued: true, width: 30 });

        doc
          .fillColor(COLORS.bullet)
          .text(`  ${bullet}`, {
            width: PAGE_W - PAD_X * 2 - 30,
            lineGap: 2,
          });

        bulletY += 44;
      }
    }

    doc.end();
  });
}
