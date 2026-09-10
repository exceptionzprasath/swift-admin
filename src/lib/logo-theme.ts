import { useEffect, useState } from "react";
import { resolveImageToDataUrl } from "./documents";

export interface LogoColorPalette {
  primaryRgb: [number, number, number];
  primaryHex: string;
  primaryDarkRgb: [number, number, number];
  primaryDarkHex: string;
  primaryLightHex: string;
  accentRgb: [number, number, number];
  accentHex: string;
  accentLightHex: string;
  isExtracted: boolean;
}

export const DEFAULT_LOGO_PALETTE: LogoColorPalette = {
  primaryRgb: [15, 23, 42],        // #0F172A (Deep Slate / Navy)
  primaryHex: "#0F172A",
  primaryDarkRgb: [10, 15, 30],
  primaryDarkHex: "#0A0F1E",
  primaryLightHex: "#F1F5F9",
  accentRgb: [6, 182, 212],         // #06B6D4 (Vibrant Cyan)
  accentHex: "#06B6D4",
  accentLightHex: "#E0F2FE",
  isExtracted: false,
};

const paletteCache = new Map<string, LogoColorPalette>();

/**
 * Converts RGB numbers to Hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates color saturation from RGB (0 to 1).
 */
function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/**
 * Calculates relative luminance for RGB.
 */
function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Analyzes an image (data URL or standard URL) via an off-screen HTML5 Canvas
 * to extract the most dominant and vibrant brand colors.
 */
export async function extractLogoPalette(imageUrl?: string): Promise<LogoColorPalette> {
  if (!imageUrl || typeof window === "undefined") {
    return DEFAULT_LOGO_PALETTE;
  }

  if (paletteCache.has(imageUrl)) {
    return paletteCache.get(imageUrl)!;
  }

  // Pre-resolve into a data URL to prevent canvas cross-origin tainting
  let effectiveSrc = imageUrl;
  if (!imageUrl.startsWith("data:")) {
    try {
      const resolved = await resolveImageToDataUrl(imageUrl);
      if (resolved) {
        effectiveSrc = resolved;
      }
    } catch {
      // ignore
    }
  }

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (pal: LogoColorPalette) => {
      if (!resolved) {
        resolved = true;
        resolve(pal);
      }
    };

    // Generous timeout for large base64 data URLs / slow loads
    const timer = setTimeout(() => {
      safeResolve(DEFAULT_LOGO_PALETTE);
    }, 4000);

    const img = new Image();
    if (!effectiveSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          safeResolve(DEFAULT_LOGO_PALETTE);
          return;
        }

        // Use 128x128 for detailed sampling of wide letterhead banners and logos
        const sampleW = 128;
        const sampleH = 128;
        canvas.width = sampleW;
        canvas.height = sampleH;
        ctx.drawImage(img, 0, 0, sampleW, sampleH);

        const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
        const colorBuckets = new Map<string, { r: number; g: number; b: number; count: number; score: number }>();

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          // Ignore transparent or nearly transparent pixels
          if (a < 30) continue;

          // Relative luminance
          const lum = getLuminance(r, g, b);
          // Ignore pure white or near-white background pixels (paper/letterhead canvas) and deep black
          if (lum > 238 || lum < 12) continue;

          const sat = getSaturation(r, g, b);
          // If low saturation and light (e.g. letterhead white/gray paper margins), skip
          if (sat < 0.12 && lum > 170) continue;

          // Bucket colors into 16-step chunks for fine fidelity
          const quant = 16;
          const qr = Math.floor(r / quant) * quant;
          const qg = Math.floor(g / quant) * quant;
          const qb = Math.floor(b / quant) * quant;
          const key = `${qr}_${qg}_${qb}`;

          // Heavily reward vibrant and identifiable brand colors (high saturation & rich tone)
          const score = 1 + Math.pow(sat, 1.8) * 15 + (lum >= 40 && lum <= 200 ? 3 : 0);

          const existing = colorBuckets.get(key);
          if (existing) {
            existing.count += 1;
            existing.score += score;
          } else {
            colorBuckets.set(key, { r: qr, g: qg, b: qb, count: 1, score });
          }
        }

        const sorted = Array.from(colorBuckets.values()).sort((a, b) => b.score - a.score);

        if (sorted.length === 0) {
          safeResolve(DEFAULT_LOGO_PALETTE);
          return;
        }

        const top = sorted[0];
        const primaryRgb: [number, number, number] = [top.r, top.g, top.b];
        const primaryHex = rgbToHex(top.r, top.g, top.b);

        // Find an accent color distinct from primary (color distance > 65 with good saturation)
        let accentCandidate = sorted.find((c) => {
          const dist = Math.abs(c.r - top.r) + Math.abs(c.g - top.g) + Math.abs(c.b - top.b);
          const sat = getSaturation(c.r, c.g, c.b);
          return dist > 65 && sat > 0.25;
        });

        if (!accentCandidate) {
          accentCandidate = sorted.find((c) => {
            const dist = Math.abs(c.r - top.r) + Math.abs(c.g - top.g) + Math.abs(c.b - top.b);
            return dist > 60;
          });
        }

        let accentRgb: [number, number, number];
        let accentHex: string;

        if (accentCandidate) {
          accentRgb = [accentCandidate.r, accentCandidate.g, accentCandidate.b];
          accentHex = rgbToHex(accentCandidate.r, accentCandidate.g, accentCandidate.b);
        } else {
          // Compute harmonious accent by shifting brightness
          const ar = Math.min(255, Math.round(top.r * 1.3 + 30));
          const ag = Math.min(255, Math.round(top.g * 1.3 + 30));
          const ab = Math.min(255, Math.round(top.b * 1.3 + 30));
          accentRgb = [ar, ag, ab];
          accentHex = rgbToHex(ar, ag, ab);
        }

        // Dark tone for top header banner - retain 65% of rich brand hue
        const pdr = Math.max(12, Math.round(top.r * 0.65));
        const pdg = Math.max(12, Math.round(top.g * 0.65));
        const pdb = Math.max(18, Math.round(top.b * 0.65));
        const primaryDarkRgb: [number, number, number] = [pdr, pdg, pdb];
        const primaryDarkHex = rgbToHex(pdr, pdg, pdb);

        // Light tints for background cards and badges
        const primaryLightHex = rgbToHex(
          Math.min(255, Math.round(top.r * 0.12 + 240)),
          Math.min(255, Math.round(top.g * 0.12 + 240)),
          Math.min(255, Math.round(top.b * 0.12 + 240))
        );

        const accentLightHex = rgbToHex(
          Math.min(255, Math.round(accentRgb[0] * 0.12 + 240)),
          Math.min(255, Math.round(accentRgb[1] * 0.12 + 240)),
          Math.min(255, Math.round(accentRgb[2] * 0.12 + 240))
        );

        const palette: LogoColorPalette = {
          primaryRgb,
          primaryHex,
          primaryDarkRgb,
          primaryDarkHex,
          primaryLightHex,
          accentRgb,
          accentHex,
          accentLightHex,
          isExtracted: true,
        };

        paletteCache.set(imageUrl, palette);
        if (effectiveSrc !== imageUrl) {
          paletteCache.set(effectiveSrc, palette);
        }
        safeResolve(palette);
      } catch {
        safeResolve(DEFAULT_LOGO_PALETTE);
      }
    };

    img.onerror = () => {
      safeResolve(DEFAULT_LOGO_PALETTE);
    };

    img.src = effectiveSrc;
  });
}

/**
 * React hook to dynamically obtain and react to company logo color extraction.
 */
export function useLogoPalette(logoDataUrl?: string): LogoColorPalette {
  const [palette, setPalette] = useState<LogoColorPalette>(() => {
    if (logoDataUrl && paletteCache.has(logoDataUrl)) {
      return paletteCache.get(logoDataUrl)!;
    }
    return DEFAULT_LOGO_PALETTE;
  });

  useEffect(() => {
    let active = true;
    if (!logoDataUrl) {
      setPalette(DEFAULT_LOGO_PALETTE);
      return;
    }

    extractLogoPalette(logoDataUrl).then((extracted) => {
      if (active) {
        setPalette(extracted);
      }
    });

    return () => {
      active = false;
    };
  }, [logoDataUrl]);

  return palette;
}
