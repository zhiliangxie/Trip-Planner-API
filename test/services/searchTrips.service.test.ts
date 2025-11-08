import { SearchTripsService } from '../../src/services/searchTrips.service';
import { AppError } from '../../src/utils/errors';
import { Trip } from '../../src/types/trip';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('SearchTripsService', () => {
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
    jest.useFakeTimers();
    service = new SearchTripsService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch trips successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrips,
    });

    const result = await service.getTrips('ATL', 'PEK', 'cheapest');

    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockTrips);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips,
      });

    const resultPromise = service.getTrips('ATL', 'PEK', 'fastest');

    await Promise.resolve(); // let the first rejection propagate
    jest.advanceTimersByTime(300);

    const result = await resultPromise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockTrips);
  });

  it('should retry failed requests and throw FETCH_RETRY_FAILED after max retries', async () => {
    mockFetch.mockRejectedValue(new Error('Network down'));

    const promise = service.getTrips('ATL', 'PEK');

    // simulate exponential backoff
    for (let i = 1; i <= 3; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(300 * i);
    }

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      code: 'FETCH_RETRY_FAILED',
      statusCode: 502,
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
