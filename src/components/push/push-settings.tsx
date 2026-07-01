"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushSettings() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const supp =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(supp);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isIos && !standalone) setNeedsInstall(true);

    if (supp) {
      navigator.serviceWorker.getRegistration().then(async (reg) => {
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setSubscribed(!!sub);
      });
    }
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) throw new Error("Chýba VAPID public key v env.");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Povolenie pre notifikácie zamietnuté.");

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const json = sub.toJSON();

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys, userAgent: navigator.userAgent }),
      });
      if (!res.ok) throw new Error("Uloženie subscription zlyhalo.");
      setSubscribed(true);
      setMsg("Notifikácie zapnuté ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("Notifikácie vypnuté.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const d = await res.json();
      setMsg(res.ok ? `Odoslané (${d.sent}).` : d.error ?? "Chyba.");
    } catch {
      setMsg("Chyba.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent">
          <Bell className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="font-semibold text-white">Notifikácie</h2>
          <p className="text-xs text-muted">Pitný režim, jedlo okolo tréningu, počasie</p>
        </div>
      </div>

      {!supported ? (
        <p className="text-sm text-muted">Tento prehliadač push notifikácie nepodporuje.</p>
      ) : (
        <>
          {needsInstall && (
            <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
              Na iPhone: otvor appku z plochy (Zdieľať → Pridať na plochu), inak iOS push neumožní.
            </p>
          )}

          {!subscribed ? (
            <button
              onClick={enable}
              disabled={busy}
              className="w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? "…" : "Zapnúť notifikácie"}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={test}
                disabled={busy}
                className="flex-1 rounded-card border border-border bg-surface-2 py-3 text-sm font-medium transition active:scale-[0.99] disabled:opacity-60"
              >
                Test notifikácie
              </button>
              <button
                onClick={disable}
                disabled={busy}
                className="flex-1 rounded-card border border-border bg-surface-2 py-3 text-sm font-medium text-muted transition active:scale-[0.99] disabled:opacity-60"
              >
                Vypnúť
              </button>
            </div>
          )}

          {msg && <p className="text-sm text-muted">{msg}</p>}
        </>
      )}
    </div>
  );
}
