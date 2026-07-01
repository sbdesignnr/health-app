"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

type Props = {
  onDetected: (code: string) => void;
  onError?: (message: string) => void;
};

export function BarcodeScanner({ onDetected, onError }: Props) {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  const [starting, setStarting] = useState(true);

  // Drž aktuálne callbacky bez reštartu kamery pri re-renderi rodiča.
  useEffect(() => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const videoEl = videoRef.current;
    let controls: { stop: () => void } | null = null;
    let active = true;

    // Obmedzíme na 1D formáty potravín (EAN/UPC) – rýchlejšie a spoľahlivejšie.
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    const reader = new BrowserMultiFormatReader(hints);

    // Odložený štart: synchrónny cleanup (napr. StrictMode dvojitý mount v deve)
    // stihne zrušiť timer skôr, než sa kamera spustí → žiadne preteky / dvojité play().
    const timer = setTimeout(async () => {
      if (!active || !videoEl) return;

      // Kamera (getUserMedia) je dostupná len v „secure context" – HTTPS alebo localhost.
      // Na telefóne cez http://IP je navigator.mediaDevices undefined → jasná hláška.
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        onErrorRef.current?.(
          "Kamera funguje len cez zabezpečené pripojenie (HTTPS). Spusti appku cez HTTPS – alebo zadaj čiarový kód ručne.",
        );
        return;
      }

      try {
        const c = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoEl,
          (result, _err, ctrl) => {
            if (result) {
              ctrl.stop();
              onDetectedRef.current(result.getText());
            }
          },
        );
        if (!active) {
          c.stop();
        } else {
          controls = c;
          setStarting(false);
        }
      } catch (e) {
        if (!active) return;
        const name = e instanceof Error ? e.name : "";
        let msg = "Kameru sa nepodarilo spustiť. Skús to znova.";
        if (name === "NotAllowedError" || name === "SecurityError")
          msg = "Prístup ku kamere bol zamietnutý. Povoľ kameru v nastaveniach prehliadača.";
        else if (name === "NotFoundError" || name === "OverconstrainedError")
          msg = "Nenašla sa žiadna kamera.";
        else if (e instanceof Error && e.message) msg = e.message;
        onErrorRef.current?.(msg);
      }
    }, 60);

    return () => {
      active = false;
      clearTimeout(timer);
      controls?.stop();
      // Tvrdé dočistenie – zhasne kameru aj keď controls ešte neboli k dispozícii.
      const stream = videoEl?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
    };
  }, []);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-card border border-border bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />

      {/* tmavá vignette po okrajoch – zameria pozornosť na rámček */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.62)_100%)]" />

      {/* skenovací rámček s rohovými zátvorkami + laser */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="relative h-40 w-[78%] max-w-72">
          <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l-2 border-t-2 border-accent" />
          <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r-2 border-t-2 border-accent" />
          <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b-2 border-l-2 border-accent" />
          <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b-2 border-r-2 border-accent" />

          {reduce ? (
            <span className="absolute inset-x-2 top-1/2 h-[2px] rounded-full bg-accent/80" />
          ) : (
            <motion.span
              className="absolute inset-x-2 h-[2px] rounded-full bg-accent shadow-[0_0_14px_2px_rgba(168,255,62,0.75)]"
              initial={{ top: "8%" }}
              animate={{ top: ["8%", "92%", "8%"] }}
              transition={{ duration: 2.6, ease: "easeInOut", repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* nápoveda */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <span className="rounded-full bg-black/55 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">
          Namier na čiarový kód
        </span>
      </div>

      {starting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
          <motion.span
            className="h-8 w-8 rounded-full border-2 border-white/20 border-t-accent"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
          />
          <p className="text-sm text-white/80">Spúšťam kameru…</p>
        </div>
      )}
    </div>
  );
}
