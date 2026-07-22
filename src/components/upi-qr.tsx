import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function buildUpiUri(opts: { upiId: string; payeeName: string; amount?: number; note?: string; merchantCode?: string }) {
  const p = new URLSearchParams();
  p.set("pa", opts.upiId);
  p.set("pn", opts.payeeName);
  if (opts.amount && opts.amount > 0) p.set("am", opts.amount.toFixed(2));
  p.set("cu", "INR");
  if (opts.note) p.set("tn", opts.note.slice(0, 50));
  if (opts.merchantCode) p.set("mc", opts.merchantCode);
  return `upi://pay?${p.toString()}`;
}

export function UpiQR({
  upiId, payeeName, amount, note, merchantCode, overrideImage, size = 220,
}: {
  upiId: string; payeeName: string; amount?: number; note?: string; merchantCode?: string;
  overrideImage?: string; size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");
  useEffect(() => {
    if (overrideImage) { setDataUrl(overrideImage); return; }
    const uri = buildUpiUri({ upiId, payeeName, amount, note, merchantCode });
    QRCode.toDataURL(uri, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then(setDataUrl).catch(() => setDataUrl(""));
  }, [upiId, payeeName, amount, note, merchantCode, overrideImage, size]);
  if (!dataUrl) return <div style={{ width: size, height: size }} className="rounded-lg bg-muted animate-pulse" />;
  return <img src={dataUrl} alt="UPI QR" width={size} height={size} className="rounded-lg border bg-white p-2" />;
}
