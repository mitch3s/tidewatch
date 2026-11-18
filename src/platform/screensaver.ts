/**
 * Keeping LG's screensaver away (spec 11, plan 8.2).
 *
 * webOS has no documented way for an app to stop the TV's screensaver. It
 * does have an undocumented one, used by several open-source TV apps:
 * register with the TV power service, and the TV then asks before starting
 * the screensaver; replying with `ack: false` and the request's timestamp
 * says no. Behaviour differs between firmware versions, so:
 *  - the client name is unique per start (webOS 10.3 rejects re-registering
 *    a name until the app process ends);
 *  - any message with a timestamp counts as a request (the state field
 *    varies or is missing on some versions);
 *  - some versions deny the call (seen on webOS 3 in Developer Mode); the
 *    status says so, and the caller can fall back to something else.
 */

const SERVICE = 'luna://com.webos.service.tvpower/power';

/** Make a Luna service call; `onMessage` receives every reply (subscriptions reply repeatedly). */
export type LunaCall = (uri: string, params: Record<string, unknown>, onMessage: (msg: Record<string, unknown>) => void) => void;

export class ScreensaverVeto {
  /** For the debug readout: 'idle', 'registering', 'active', or 'denied: …'. */
  status = 'idle';
  /** How many times the screensaver was refused. */
  vetoes = 0;
  private readonly clientName: string;
  private started = false;

  constructor(
    private readonly call: LunaCall,
    now: () => number = Date.now,
  ) {
    this.clientName = `tidewatch-${now()}`;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.status = 'registering';
    this.call(`${SERVICE}/registerScreenSaverRequest`, { subscribe: true, clientName: this.clientName }, (msg) => this.onMessage(msg));
  }

  private onMessage(msg: Record<string, unknown>): void {
    if (msg.returnValue === false) {
      this.status = `denied: ${String(msg.errorText ?? msg.errorCode ?? 'unknown error')}`;
      return;
    }
    if (typeof msg.timestamp === 'number' || typeof msg.timestamp === 'string') {
      this.vetoes++;
      this.call(`${SERVICE}/responseScreenSaverRequest`, { clientName: this.clientName, ack: false, timestamp: msg.timestamp }, () => {});
      return;
    }
    if (msg.returnValue === true) this.status = 'active';
  }
}

interface PalmServiceBridgeLike {
  onservicecallback: ((json: string) => void) | null;
  call(uri: string, params: string): void;
}

/**
 * A Luna call using the TV's built-in PalmServiceBridge (what LG's
 * webOSTV.js library uses underneath), or null when it isn't available.
 */
export function palmLunaCall(): LunaCall | null {
  const Bridge = (window as unknown as { PalmServiceBridge?: new () => PalmServiceBridgeLike }).PalmServiceBridge;
  if (!Bridge) return null;
  // Keep bridges alive: a subscription delivers its replies through its bridge.
  const live: PalmServiceBridgeLike[] = [];
  return (uri, params, onMessage) => {
    const bridge = new Bridge();
    live.push(bridge);
    bridge.onservicecallback = (json) => {
      try {
        onMessage(JSON.parse(json) as Record<string, unknown>);
      } catch {
        /* ignore malformed replies */
      }
    };
    bridge.call(uri, JSON.stringify(params));
  };
}
