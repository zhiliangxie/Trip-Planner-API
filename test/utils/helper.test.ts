import { isSupportedAirport, buildSearchCacheKey, SUPPORTED_AIRPORTS } from '../../src/utils/helper';

describe('when invoking isSupportedAirport', () => {
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

  it('should not throw when given non-alphabetic input', () => {
    expect(() => isSupportedAirport('@@@')).not.toThrow();
    expect(isSupportedAirport('@@@')).toBe(false);
  });
});

describe('when invoking buildSearchCacheKey', () => {
  it('should build a valid Redis cache key for given origin and destination', () => {
    const key = buildSearchCacheKey('ATL', 'PEK');
    expect(key).toBe('trips:ATL:PEK');
  });

  it('should handle lowercase inputs by keeping case as-is', () => {
    const key = buildSearchCacheKey('atl', 'pek');
    expect(key).toBe('trips:atl:pek');
  });

  it('should create unique keys for different airport pairs', () => {
    const key1 = buildSearchCacheKey('ATL', 'PEK');
    const key2 = buildSearchCacheKey('ATL', 'LAX');
    const key3 = buildSearchCacheKey('LAX', 'ATL');
    expect(new Set([key1, key2, key3]).size).toBe(3);
  });
});
