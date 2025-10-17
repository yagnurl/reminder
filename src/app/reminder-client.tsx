"use client";

import { useEffect, useRef, useState } from "react";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const MESSAGES = [
  "Dik oturuyorsun degil mi?",
  "Toparlan birakma kendini",
  "Dik oturma saati!",
];

function canUseNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function getBrowserInfo() {
  if (typeof navigator === "undefined")
    return { name: "unknown", settingsUrl: null as string | null };
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua))
    return {
      name: "edge",
      settingsUrl: "edge://settings/content/notifications",
    };
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua))
    return {
      name: "chrome",
      settingsUrl: "chrome://settings/content/notifications",
    };
  if (/Firefox\//.test(ua))
    return { name: "firefox", settingsUrl: "about:preferences#privacy" };
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua))
    return { name: "safari", settingsUrl: null };
  return { name: "unknown", settingsUrl: null };
}

export default function ReminderClient() {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const intervalRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const messageIndexRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!canUseNotifications()) return;
    setPermission(Notification.permission);
  }, [mounted]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const registerServiceWorker = async () => {
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.register("/sw.js");
        } catch {
          // ignore
        }
      }
    };

    registerServiceWorker();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "FOCUS_FROM_NOTIFICATION") {
        window.focus();
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
  }, []);

  const requestPermission = async () => {
    if (!canUseNotifications()) {
      alert(
        "Tarayıcınız bildirimleri desteklemiyor. iOS için uygulamayı ana ekrana ekleyin."
      );
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log("permission after request:", result);
      return result;
    } catch {
      return permission;
    }
  };

  const getNextMessage = () => {
    const msg = MESSAGES[messageIndexRef.current % MESSAGES.length];
    messageIndexRef.current += 1;
    return msg;
  };

  const showNotification = async (customBody?: string) => {
    if (!canUseNotifications()) return;
    if (Notification.permission !== "granted") {
      console.log(
        "showNotification: blocked, permission:",
        Notification.permission
      );
      return;
    }

    try {
      const readyReg = await navigator.serviceWorker.ready.catch(() => null);
      const activeReg =
        readyReg || (await navigator.serviceWorker.getRegistration());
      const title = "Dik otur!";
      const body = customBody ?? getNextMessage();
      const options: NotificationOptions = {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "posture-reminder",
        requireInteraction: true,
        silent: false,
      };
      if (activeReg) {
        await activeReg.showNotification(title, options);
        console.log("showNotification: via service worker");
      } else {
        new Notification(title, options);
        console.log("showNotification: via Notification constructor");
      }
    } catch (err) {
      console.error("Notification error", err);
      alert(
        "Bildirim gösterilemedi. Tarayıcı/OS bildirimlerini kontrol edin (Rahatsız Etmeyin kapalı mı?)."
      );
    }
  };

  const startReminders = async () => {
    if (!canUseNotifications()) {
      alert(
        "Tarayıcınız bildirimleri desteklemiyor. iOS için uygulamayı ana ekrana ekleyin."
      );
    }
    if (Notification.permission !== "granted") {
      await requestPermission();
    }
    if (Notification.permission !== "granted") {
      alert("Bildirim izni verilmedi. Site izinlerinden 'Allow' verin.");
      return;
    }

    await showNotification();
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(
      () => showNotification(),
      THIRTY_MINUTES_MS
    );
    startedRef.current = true;
  };

  const stopReminders = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startedRef.current = false;
  };

  useEffect(() => {
    if (!mounted) return;
    if (!canUseNotifications()) return;
    if (permission === "default") {
      void requestPermission();
    }
  }, [mounted, permission]);

  useEffect(() => {
    if (!mounted) return;
    if (!canUseNotifications()) return;
    if (Notification.permission === "granted" && !startedRef.current) {
      void startReminders();
    }
  }, [mounted, permission]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const openNotificationSettings = () => {
    const { name, settingsUrl } = getBrowserInfo();
    if (settingsUrl) {
      const opened = window.open(settingsUrl, "_blank");
      if (!opened) {
        alert(
          "Ayar sayfası açılamadı. Lütfen adres çubuğu kilit simgesine tıklayın."
        );
      }
      return;
    }
    if (name === "safari") {
      alert(
        "Safari (macOS): Safari > Settings > Websites > Notifications.\n" +
          "Safari (iOS): Ayarlar > Safari > Bildirimler veya Ayarlar > Bildirimler."
      );
      return;
    }
    alert(
      "Bildirim izinlerini tarayıcınızın site ayarlarından açın (kilit ikonuna tıklayın)."
    );
  };

  if (!mounted) {
    return null;
  }

  const testNow = async () => {
    if (Notification.permission !== "granted") {
      await requestPermission();
    }
    await showNotification();
  };

  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 720,
    margin: "24px auto",
    padding: 24,
    borderRadius: 16,
    background: "#f8fafc",
    color: "#1f2937",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  };

  const buttonBase: React.CSSProperties = {
    padding: "14px 18px",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    border: "1px solid transparent",
    cursor: "pointer",
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          marginBottom: 10,
          fontSize: 18,
          fontWeight: 700,
          color: "#334155",
        }}
      >
        Postür Hatırlatıcı Kontrolleri
      </div>

      <div style={rowStyle}>
        {!canUseNotifications() && (
          <span style={{ color: "#a16207" }}>
            Bildirimler bu tarayıcıda desteklenmiyor. iOS: “Ana Ekrana Ekle”.
          </span>
        )}
        {permission === "denied" && (
          <span style={{ color: "#b91c1c" }}>
            Bildirim izni reddedildi. Site ayarlarından bildirime izin verin.
          </span>
        )}
      </div>

      <div style={rowStyle}>
        <button
          onClick={requestPermission}
          style={{
            ...buttonBase,
            background: "#dbeafe",
            color: "#1e3a8a",
            borderColor: "#bfdbfe",
          }}
        >
          Bildirim izni iste ({permission})
        </button>
        <button
          onClick={testNow}
          style={{
            ...buttonBase,
            background: "#dcfce7",
            color: "#065f46",
            borderColor: "#bbf7d0",
          }}
        >
          Test bildirim
        </button>
        <button
          onClick={startReminders}
          style={{
            ...buttonBase,
            background: "#fde68a",
            color: "#7c2d12",
            borderColor: "#fcd34d",
          }}
        >
          30 dk hatırlatmaları başlat
        </button>
        <button
          onClick={stopReminders}
          style={{
            ...buttonBase,
            background: "#e5e7eb",
            color: "#374151",
            borderColor: "#d1d5db",
          }}
        >
          Durdur
        </button>
        {permission === "denied" && (
          <button
            onClick={openNotificationSettings}
            style={{
              ...buttonBase,
              background: "#fecaca",
              color: "#7f1d1d",
              borderColor: "#fca5a5",
            }}
          >
            Bildirim ayarlarını açmayı dene
          </button>
        )}
      </div>
    </div>
  );
}
