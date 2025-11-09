import { TripManagerService } from '../../src/services/tripManager.service';
import { prisma } from '../../src/db/prisma';
import { searchTripsService } from '../../src/services/searchTrips.service';
import { Trip } from '../../src/types/trip';
import { redis } from '../../src/db/redis';
import { AppError } from '../../src/utils/errors';
import { CACHE_KEY_TRIPS } from '../../src/utils/helper';

// Mock dependencies
jest.mock('../../src/db/prisma', () => ({
  prisma: {
    trip: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../src/services/searchTrips.service', () => ({
  searchTripsService: {
    findTrips: jest.fn(),
  },
}));

jest.mock('../../src/db/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  },
}));

describe('TripManagerService', () => {
  const service = new TripManagerService();

  const mockTrip: Trip =
  {
    id: '1',
    origin: 'ATL',
    destination: 'PEK',
    cost: 100,
    duration: 120,
    type: 'flight',
    display_name: 'ATL to PEK',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // SAVE TRIP
  // --------------------------------------------------------------------------
  describe('when invoking saveTrip', () => {
    it('should save a trip successfully and clear cache', async () => {
      (searchTripsService.findTrips as jest.Mock).mockResolvedValue([mockTrip]);
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.trip.create as jest.Mock).mockResolvedValue(mockTrip);
      (redis.keys as jest.Mock).mockResolvedValue([`${CACHE_KEY_TRIPS}:20:0`]);
      (redis.del as jest.Mock).mockResolvedValue(1);

      const result = await service.saveTrip('1', 'ATL', 'PEK');

      expect(searchTripsService.findTrips).toHaveBeenCalledWith('ATL', 'PEK');
      expect(prisma.trip.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: {
          id: mockTrip.id,
          origin: mockTrip.origin,
          destination: mockTrip.destination,
          cost: mockTrip.cost,
          duration: mockTrip.duration,
          type: mockTrip.type,
          display_name: mockTrip.display_name,
        },
      });
      expect(redis.keys).toHaveBeenCalledWith(`${CACHE_KEY_TRIPS}*`);
      expect(redis.del).toHaveBeenCalledWith(`${CACHE_KEY_TRIPS}:20:0`);
      expect(result).toEqual(mockTrip);
    });

    it('should handle cache clearing failure', async () => {
      (searchTripsService.findTrips as jest.Mock).mockResolvedValue([mockTrip]);
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.trip.create as jest.Mock).mockResolvedValue(mockTrip);
      (redis.keys as jest.Mock).mockResolvedValue([`${CACHE_KEY_TRIPS}:20:0`]);
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should still succeed even if cache clearing fails
      const result = await service.saveTrip('1', 'ATL', 'PEK');

      expect(result).toEqual(mockTrip);
    });

    it('should throw TRIP_NOT_FOUND if trip is missing from external results', async () => {
      (searchTripsService.findTrips as jest.Mock).mockResolvedValue([]);

      await expect(service.saveTrip('1', 'ATL', 'PEK')).rejects.toMatchObject({
        code: 'TRIP_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw TRIP_ALREADY_SAVED if trip already exists in DB', async () => {
      (searchTripsService.findTrips as jest.Mock).mockResolvedValue([mockTrip]);
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip);

      await expect(service.saveTrip('1', 'ATL', 'PEK')).rejects.toMatchObject({
        code: 'TRIP_ALREADY_SAVED',
        statusCode: 409,
      });
    });

    it('should throw DB_ERROR if Prisma create fails', async () => {
      (searchTripsService.findTrips as jest.Mock).mockResolvedValue([mockTrip]);
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.trip.create as jest.Mock).mockRejectedValue(new Error('DB exploded'));

      await expect(service.saveTrip('1', 'ATL', 'PEK')).rejects.toMatchObject({
        code: 'DB_ERROR',
        statusCode: 500,
      });
    });
  });

  // --------------------------------------------------------------------------
  // LIST TRIPS
  // --------------------------------------------------------------------------
  describe('when invoking listTrips', () => {
    it('should return trips list from database when not cached', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.trip.findMany as jest.Mock).mockResolvedValue([mockTrip]);
      (redis.set as jest.Mock).mockResolvedValue('OK');

      const result = await service.listTrips(10, 0);

      expect(redis.get).toHaveBeenCalledWith(`${CACHE_KEY_TRIPS}:10:0`);
      expect(prisma.trip.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        orderBy: { created_at: 'desc' },
      });
      expect(redis.set).toHaveBeenCalledWith(
        `${CACHE_KEY_TRIPS}:10:0`,
        JSON.stringify([mockTrip]),
        'EX',
        expect.any(Number) // config.cacheTTL
      );
      expect(result).toEqual([mockTrip]);
    });

    it('should return trips list from cache when available', async () => {
      const cachedTrips = JSON.stringify([mockTrip]);
      (redis.get as jest.Mock).mockResolvedValue(cachedTrips);

      const result = await service.listTrips(10, 0);

      expect(redis.get).toHaveBeenCalledWith(`${CACHE_KEY_TRIPS}:10:0`);
      expect(prisma.trip.findMany).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
      expect(result).toEqual([mockTrip]);
    });

    it('should use default pagination values', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.trip.findMany as jest.Mock).mockResolvedValue([]);

      await service.listTrips();

      expect(prisma.trip.findMany).toHaveBeenCalledWith({
        take: 20,
        skip: 0,
        orderBy: { created_at: 'desc' },
      });
    });

    it('should throw DB_ERROR if Prisma findMany fails', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.trip.findMany as jest.Mock).mockRejectedValue(new Error('Query fail'));

      await expect(service.listTrips()).rejects.toMatchObject({
        code: 'DB_ERROR',
        statusCode: 500,
      });
    });
  });

  // --------------------------------------------------------------------------
  // DELETE TRIP
  // --------------------------------------------------------------------------
  describe('when invoking deleteTrip', () => {
    it('should delete trip successfully and clear cache', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.trip.delete as jest.Mock).mockResolvedValue(undefined);
      (redis.keys as jest.Mock).mockResolvedValue([`${CACHE_KEY_TRIPS}:20:0`]);
      (redis.del as jest.Mock).mockResolvedValue(1);

      await expect(service.deleteTrip('1')).resolves.not.toThrow();

      expect(prisma.trip.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.trip.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(redis.keys).toHaveBeenCalledWith(`${CACHE_KEY_TRIPS}*`);
      expect(redis.del).toHaveBeenCalledWith(`${CACHE_KEY_TRIPS}:20:0`);
    });

    it('should handle empty cache keys gracefully', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.trip.delete as jest.Mock).mockResolvedValue(undefined);
      (redis.keys as jest.Mock).mockResolvedValue([]);

      await service.deleteTrip('1');

      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should handle cache clearing failure gracefully during delete', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.trip.delete as jest.Mock).mockResolvedValue(undefined);
      (redis.keys as jest.Mock).mockResolvedValue([`${CACHE_KEY_TRIPS}:20:0`]);
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should still succeed even if cache clearing fails
      await expect(service.deleteTrip('1')).resolves.not.toThrow();
    });

    it('should throw TRIP_NOT_FOUND if trip does not exist', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteTrip('trip999')).rejects.toMatchObject({
        code: 'TRIP_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw DB_ERROR if Prisma delete fails', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.trip.delete as jest.Mock).mockRejectedValue(new Error('DB delete fail'));

      await expect(service.deleteTrip('1')).rejects.toMatchObject({
        code: 'DB_ERROR',
        statusCode: 500,
      });
    });
  });
});
