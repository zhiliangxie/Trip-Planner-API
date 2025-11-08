import { TripManagerService } from '../../src/services/tripManager.service';
import { prisma } from '../../src/db/prisma';
import { searchTripsService } from '../../src/services/searchTrips.service';
import { Trip } from '../../src/types/trip';

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
    getTrips: jest.fn(),
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
    it('should save a trip successfully', async () => {
      (searchTripsService.getTrips as jest.Mock).mockResolvedValue([mockTrip]);
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.trip.create as jest.Mock).mockResolvedValue(mockTrip);

      const result = await service.saveTrip('1', 'ATL', 'PEK');

      expect(searchTripsService.getTrips).toHaveBeenCalledWith('ATL', 'PEK');
      expect(prisma.trip.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.trip.create).toHaveBeenCalled();
      expect(result).toEqual(mockTrip);
    });

    it('should throw TRIP_NOT_FOUND if trip is missing from external results', async () => {
      (searchTripsService.getTrips as jest.Mock).mockResolvedValue([]);

      await expect(service.saveTrip('1', 'ATL', 'PEK')).rejects.toMatchObject({
        code: 'TRIP_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw TRIP_ALREADY_SAVED if trip already exists in DB', async () => {
      (searchTripsService.getTrips as jest.Mock).mockResolvedValue([mockTrip]);
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip);

      await expect(service.saveTrip('1', 'ATL', 'PEK')).rejects.toMatchObject({
        code: 'TRIP_ALREADY_SAVED',
        statusCode: 409,
      });
    });

    it('should throw DB_ERROR if Prisma create fails', async () => {
      (searchTripsService.getTrips as jest.Mock).mockResolvedValue([mockTrip]);
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
    it('should return trips list', async () => {
      (prisma.trip.findMany as jest.Mock).mockResolvedValue([mockTrip]);

      const result = await service.listTrips(10, 0);

      expect(prisma.trip.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        orderBy: { created_at: 'desc' },
      });
      expect(result).toEqual([mockTrip]);
    });

    it('should throw DB_ERROR if Prisma findMany fails', async () => {
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
    it('should delete trip successfully', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.trip.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(service.deleteTrip('1')).resolves.not.toThrow();

      expect(prisma.trip.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.trip.delete).toHaveBeenCalledWith({ where: { id: '1' } });
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
