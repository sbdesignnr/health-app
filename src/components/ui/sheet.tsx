"use client";

import { useEffect, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22 }}
      />
      <motion.div
        className="pb-safe relative z-10 max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-border bg-bg px-4 pt-3"
        initial={reduce ? false : { y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 36 }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        {title && <h3 className="mb-3 text-lg font-semibold">{title}</h3>}
        <div className="pb-4">{children}</div>
      </motion.div>
    </div>
  );
}
