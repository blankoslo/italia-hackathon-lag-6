export interface SharePayload {
  n: string;     // name
  r: string[];   // route IDs
  s?: string;    // startDate (ISO)
  e?: string;    // endDate (ISO)
}

export function encodeShareToken(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  const b64 =
    typeof window !== "undefined"
      ? btoa(json)
      : Buffer.from(json).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShareToken(token: string): SharePayload | null {
  try {
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(token, "base64url").toString("utf8")
        : atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function buildShareUrl(payload: SharePayload, origin: string): string {
  return `${origin}/tur/${encodeShareToken(payload)}`;
}
