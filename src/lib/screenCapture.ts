export interface ScreenCapturePayload {
  videoUrl: string;
  shareUrl: string;
  source: "cloud" | "local";
  updatedAt: string;
}

const STORAGE_KEY = "neurobooth:screen-capture";
const CHANNEL_NAME = "neurobooth-screen-capture";

export function buildCloudShareUrl(videoUrl: string) {
  return `${window.location.origin}/share/cloud?url=${btoa(encodeURIComponent(videoUrl))}`;
}

export function buildLocalShareUrl(shareId: string) {
  return `${window.location.origin}/share/${shareId}`;
}

export function readScreenCapture(): ScreenCapturePayload | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScreenCapturePayload;
    if (!parsed.videoUrl || !parsed.shareUrl || !parsed.updatedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function publishScreenCapture(payload: Omit<ScreenCapturePayload, "updatedAt">) {
  const next: ScreenCapturePayload = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The screen can still be updated through BroadcastChannel in browsers that block storage.
  }

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(next);
    channel.close();
  } catch {
    // BroadcastChannel is a progressive enhancement.
  }

  return next;
}

export function subscribeScreenCapture(onCapture: (payload: ScreenCapturePayload) => void) {
  let channel: BroadcastChannel | null = null;

  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<ScreenCapturePayload>) => {
      if (event.data?.videoUrl && event.data?.shareUrl) onCapture(event.data);
    };
  } catch {
    channel = null;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as ScreenCapturePayload;
      if (payload.videoUrl && payload.shareUrl) onCapture(payload);
    } catch {
      // Ignore malformed storage events.
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}
