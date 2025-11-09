import { TripSearchService } from '../../src/services/tripSearch.service';
import { searchTripsService } from '../../src/services/searchTrips.service';
import { isSupportedAirport } from '../../src/utils/helper';
import { Trip } from '../../src/types/trip';
import { AppError } from '../../src/utils/errors';

jest.mock('../../src/services/searchTrips.service', () => ({
  searchTripsService: {
    findTrips: jest.fn(),
  },
}));

jest.mock('../../src/utils/helper', () => ({
  isSupportedAirport: jest.fn(),
}));

describe('TripSearchService', () => {
  const service = new TripSearchService();

  const mockTrips: Trip[] = [
    {
      id: '1',
      origin: 'ATL',
      destination: 'PEK',
      cost: 200,
      duration: 5,
      type: 'flight',
      display_name: 'Flight 1',
    },
    {
      id: '2',
      origin: 'ATL',
      destination: 'PEK',
      cost: 100,
      duration: 8,
      type: 'train',
      display_name: 'Bus 1',
    },
    {
      id: '3',
      origin: 'ATL',
      destination: 'PEK',
      cost: 150,
      duration: 5,
      type: 'train',
      display_name: 'Train 1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // getTrips
  // --------------------------------------------------------------------------
  describe('when invoking getTrips', () => {
    it('should normalize inputs and fetch trips', async () => {
      (isSupportedAirport as jest.Mock).mockReturnValue(true);
      (searchTripsService.findTrips as jest.Mock).mockResolvedValue(mockTrips);

      const result = await service.getTrips('atl', 'pek');

      // Validations
      expect(isSupportedAirport).toHaveBeenCalledTimes(2);
      expect(isSupportedAirport).toHaveBeenCalledWith('ATL');
      expect(isSupportedAirport).toHaveBeenCalledWith('PEK');
      expect(searchTripsService.findTrips).toHaveBeenCalledWith('ATL', 'PEK');

      // Sorting (fastest first)
      expect(result[0].duration).toBeLessThanOrEqual(result[1].duration);
    });

    it('should sort by cost when sortBy is "cheapest"', async () => {
      (isSupportedAirport as jest.Mock).mockReturnValue(true);
      (searchTripsService.findTrips as jest.Mock).mockResolvedValue(mockTrips);

      const result = await service.getTrips('ATL', 'PEK', 'cheapest');


      expect(searchTripsService.findTrips).toHaveBeenCalledWith('ATL', 'PEK');
      for (let i = 1; i < result.length; i++) {
        expect(result[i].cost).toBeGreaterThanOrEqual(result[i - 1].cost);
      }
    });

    it('should throw AppError UNSUPPORTED_AIRPORT when origin or destination invalid', async () => {
      (isSupportedAirport as jest.Mock).mockReturnValue(false);

      await expect(service.getTrips('XXX', 'YYY')).rejects.toThrow(AppError);
      await expect(service.getTrips('XXX', 'YYY')).rejects.toMatchObject({
        code: 'UNSUPPORTED_AIRPORT',
        statusCode: 400,
      });

      expect(searchTripsService.findTrips).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // sortTrips
  // --------------------------------------------------------------------------
  describe('when invoking sortTrips', () => {
    it('should sort by duration first, then cost when fastest', () => {
      const result = service['sortTrips'](mockTrips, 'fastest');

      for (let i = 1; i < result.length; i++) {
        expect(result[i].duration).toBeGreaterThanOrEqual(result[i - 1].duration);
      }
    });

    it('should sort by cost first, then duration when cheapest', () => {

      const result = service['sortTrips'](mockTrips, 'cheapest');

      for (let i = 1; i < result.length; i++) {
        expect(result[i].cost).toBeGreaterThanOrEqual(result[i - 1].cost);
      }
    });

    it('should not mutate the original trips array', () => {
      const original = [...mockTrips];

      service['sortTrips'](mockTrips, 'fastest');
      expect(mockTrips).toEqual(original);
    });

    it('should correctly break ties by cost when fastest', () => {
      const trips = [
        { ...mockTrips[0], duration: 5, cost: 300 },
        { ...mockTrips[1], duration: 5, cost: 100 },
      ];

      const result = service['sortTrips'](trips, 'fastest');
      expect(result[0].cost).toBe(100);
    });

    it('should correctly break ties by duration when cheapest', () => {
      const trips = [
        { ...mockTrips[0], cost: 200, duration: 10 },
        { ...mockTrips[1], cost: 200, duration: 5 },
      ];

      const result = service['sortTrips'](trips, 'cheapest');
      expect(result[0].duration).toBe(5);
    });
  });
});
