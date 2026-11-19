import { describe, expect, it } from 'vitest';
import { parseDevFlags } from '../../src/dev/urlFlags';

describe('parseDevFlags', () => {
  it('reads every flag', () => {
    expect(parseDevFlags('?timescale=600&visitor=now&arrival=now&unlockAll&collectAll&reset&debug&god&closeup=now')).toEqual({
      timescale: 600,
      visitorNow: true,
      arrivalNow: true,
      unlockAll: true,
      collectAll: true,
      reset: true,
      debug: true,
      god: true,
      closeupNow: true,
    });
  });

  it('defaults to off', () => {
    expect(parseDevFlags('')).toEqual({
      timescale: null,
      visitorNow: false,
      arrivalNow: false,
      unlockAll: false,
      collectAll: false,
      reset: false,
      debug: false,
      god: false,
      closeupNow: false,
    });
  });

  it('ignores a bad timescale', () => {
    expect(parseDevFlags('?timescale=fast').timescale).toBeNull();
    expect(parseDevFlags('?timescale=-2').timescale).toBeNull();
  });
});
