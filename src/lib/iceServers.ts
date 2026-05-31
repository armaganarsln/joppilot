// Fetches WebRTC ICE servers (STUN + short-lived Cloudflare TURN credentials)
// from our own backend. The Cloudflare API token stays server-side; clients
// only receive time-limited TURN credentials. Falls back to public STUN so
// same-network teleoperation keeps working even if TURN is unconfigured.

const STUN_ONLY: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

// Cache the result for the page session — credentials are long-lived (24h TTL)
// and we don't want a network round-trip every time a peer connection opens.
let cached: RTCIceServer[] | null = null;
let inflight: Promise<RTCIceServer[]> | null = null;

export async function getIceServers(): Promise<RTCIceServer[]> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/api/ice-servers');
      if (!res.ok) throw new Error(`ice-servers responded ${res.status}`);
      const data = await res.json();
      const servers: RTCIceServer[] = Array.isArray(data.iceServers) && data.iceServers.length > 0
        ? data.iceServers
        : STUN_ONLY;
      cached = servers;
      return servers;
    } catch (err) {
      console.warn('Falling back to STUN-only ICE servers:', err);
      return STUN_ONLY;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
