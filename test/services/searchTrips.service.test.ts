import { SearchTripsService } from '../../src/services/searchTrips.service';
import { AppError } from '../../src/utils/errors';
import { Trip } from '../../src/types/trip';
import { redis } from '../../src/db/redis';

// Mock Redis
jest.mock('../../src/db/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock config
jest.mock('../../src/config/env', () => ({
  config: {
    tripsApiUrl: 'https://jest.api/trips',
    tripsApiKey: 'jest-key',
    tripsMaxRetry: 3,
    cacheTTL: 300,
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('when invoking SearchTripsService.findTrips', () => {
  let service: SearchTripsService;
  const mockTrips: Trip[] = [
    {
      id: '1',
      origin: 'ATL',
      destination: 'PEK',
      cost: 100,
      duration: 120,
      type: 'flight',
      display_name: 'ATL to PEK',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchTripsService();
  });

  it('should return cached trips if available in Redis', async () => {
    (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockTrips));

    const result = await service.findTrips('ATL', 'PEK');

    expect(redis.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockTrips);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch trips from API and cache them if not in Redis', async () => {
    (redis.get as jest.Mock).mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrips,
    });

    const result = await service.findTrips('ATL', 'PEK');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockTrips);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^trips:ATL:PEK$/),
      JSON.stringify(mockTrips),
      'EX',
      300
    );
  });

  it('should retry on failure and succeed on second attempt', async () => {
    (redis.get as jest.Mock).mockResolvedValueOnce(null);

    // Mock fetch to fail once, then succeed
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips,
      });

    const result = await service.findTrips('ATL', 'PEK');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockTrips);
  });

  it('should retry failed requests and throw FETCH_RETRY_FAILED after max retries', async () => {
    (redis.get as jest.Mock).mockResolvedValueOnce(null);

    // Mock fetch to always reject
    mockFetch.mockRejectedValue(new Error('Network down'));

    const promise = service.findTrips('ATL', 'PEK');

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      code: 'FETCH_RETRY_FAILED',
      statusCode: 502,
    });

    // Should retry 3 times (max retries)
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
