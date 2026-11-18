import { describe, expect, it } from 'vitest';
import { ScreensaverVeto, type LunaCall } from '../../src/platform/screensaver';

/** A fake TV power service, recording what the app sends. */
function fakeTv() {
  const calls: Array<{ uri: string; params: Record<string, unknown> }> = [];
  let push: ((msg: Record<string, unknown>) => void) | null = null;
  const call: LunaCall = (uri, params, onMessage) => {
    calls.push({ uri, params });
    if (uri.endsWith('/registerScreenSaverRequest')) push = onMessage;
  };
  return { calls, call, push: (msg: Record<string, unknown>) => push!(msg) };
}

describe('ScreensaverVeto (webOS keep-awake)', () => {
  it('registers with the TV power service, with a unique client name', () => {
    const tv = fakeTv();
    new ScreensaverVeto(tv.call, () => 1234).start();
    expect(tv.calls[0]).toEqual({
      uri: 'luna://com.webos.service.tvpower/power/registerScreenSaverRequest',
      params: { subscribe: true, clientName: 'tidewatch-1234' },
    });
  });

  it('reports when registration succeeds or is denied', () => {
    const ok = fakeTv();
    const veto = new ScreensaverVeto(ok.call, () => 1);
    veto.start();
    expect(veto.status).toBe('registering');
    ok.push({ returnValue: true, subscribed: true });
    expect(veto.status).toBe('active');

    const denied = fakeTv();
    const v2 = new ScreensaverVeto(denied.call, () => 1);
    v2.start();
    denied.push({ returnValue: false, errorText: 'Denied method call' });
    expect(v2.status).toBe('denied: Denied method call');
  });

  it('vetoes each screensaver request by echoing its timestamp with ack false', () => {
    const tv = fakeTv();
    const veto = new ScreensaverVeto(tv.call, () => 7);
    veto.start();
    tv.push({ returnValue: true, subscribed: true });
    tv.push({ returnValue: true, state: 'Active', timestamp: 111 });
    tv.push({ timestamp: 222 }); // some firmware sends no state field
    const responses = tv.calls.filter((c) => c.uri.endsWith('/responseScreenSaverRequest'));
    expect(responses.map((r) => r.params)).toEqual([
      { clientName: 'tidewatch-7', ack: false, timestamp: 111 },
      { clientName: 'tidewatch-7', ack: false, timestamp: 222 },
    ]);
    expect(veto.vetoes).toBe(2);
  });

  it('ignores messages without a timestamp', () => {
    const tv = fakeTv();
    new ScreensaverVeto(tv.call, () => 7).start();
    tv.push({ returnValue: true, subscribed: true });
    tv.push({ returnValue: true });
    expect(tv.calls.filter((c) => c.uri.endsWith('/responseScreenSaverRequest'))).toHaveLength(0);
  });

  it('only starts once', () => {
    const tv = fakeTv();
    const veto = new ScreensaverVeto(tv.call, () => 7);
    veto.start();
    veto.start();
    expect(tv.calls).toHaveLength(1);
  });
});
