import { isSupportedAirport } from '../../src/utils/helper';

describe('isSupportedAirport', () => {
  it('should return true for supported airport codes', () => {
    expect(isSupportedAirport('ATL')).toBe(true);
    expect(isSupportedAirport('PEK')).toBe(true);
    expect(isSupportedAirport('LAX')).toBe(true);
  });

  it('should return false for unsupported airport codes', () => {
    expect(isSupportedAirport('XXX')).toBe(false);
    expect(isSupportedAirport('ABC')).toBe(false);
    expect(isSupportedAirport('')).toBe(false);
  });

  it('should handle lowercase and mixed-case inputs', () => {
    expect(isSupportedAirport('atl')).toBe(true);
    expect(isSupportedAirport('PEK')).toBe(true);
    expect(isSupportedAirport('laX')).toBe(true);
  });
});
