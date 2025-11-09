import { prisma } from '../db/prisma';
import { searchTripsService } from './searchTrips.service';
import { AppError } from '../utils/errors';
import { Trip } from '../types/trip';

/**
 * Service responsible for managing trips in the local database.
 * Provides methods to save, list, and delete trips that are fetched
 * from the external trips API.
 */
export class TripManagerService {
  /**
   * Fetches a trip from the external API and saves it to the database.
   *
   * @param {string} id - The unique identifier of the trip to save.
   * @param {string} origin - The IATA code of the origin airport (e.g. "ATL").
   * @param {string} destination - The IATA code of the destination airport (e.g. "PEK").
   * @returns {Promise<Trip>} The saved trip record.
   *
   * @throws {AppError} If the trip cannot be found, already exists, or database operations fail.
   *
   * @example
   * ```
   * const savedTrip = await tripManagerService.saveTrip('TRIP123', 'ATL', 'PEK');
   * ```
   */
  async saveTrip(id: string, origin: string, destination: string): Promise<Trip> {
    // Fetch trips from API
    const trips = await searchTripsService.findTrips(origin, destination);
    const trip = trips.find((t) => t.id === id);

    if (!trip) {
      throw new AppError('Trip not found', 404, 'TRIP_NOT_FOUND');
    }

    // Ensure trip is not already stored
    const existing = await prisma.trip.findUnique({ where: { id: trip.id } });
    if (existing) {
      throw new AppError('Trip already saved in database', 409, 'TRIP_ALREADY_SAVED');
    }

    try {
      // Save the trip
      const saved = await prisma.trip.create({
        data: {
          id: trip.id,
          origin: trip.origin,
          destination: trip.destination,
          cost: trip.cost,
          duration: trip.duration,
          type: trip.type,
          display_name: trip.display_name,
        },
      });

      return saved;
    } catch (error: unknown) {
      throw new AppError(
        error instanceof Error ? error.message : 'Failed to save trip',
        500,
        'DB_ERROR'
      );
    }
  }

  /**
   * Retrieves a paginated list of saved trips from the database.
   *
   * @param {number} [limit=20] - Maximum number of trips to return.
   * @param {number} [offset=0] - Number of trips to skip (for pagination).
   * @returns {Promise<Trip[]>} A paginated list of stored trips.
   *
   * @example
   * ```
   * const trips = await tripManagerService.listTrips(10, 0);
   * ```
   */
  async listTrips(limit = 20, offset = 0): Promise<Trip[]> {
    try {
      return await prisma.trip.findMany({
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
      });
    } catch (error: unknown) {
      throw new AppError(
        error instanceof Error ? error.message : 'Failed to list trips',
        500,
        'DB_ERROR'
      );
    }
  }

  /**
   * Deletes a saved trip from the database by its ID.
   *
   * @param {string} id - The unique identifier of the trip to delete.
   * @returns {Promise<void>}
   *
   * @throws {AppError} If the trip does not exist or a database error occurs.
   *
   * @example
   * ```
   * await tripManagerService.deleteTrip('TRIP123');
   * ```
   */
  async deleteTrip(id: string): Promise<void> {
    const trip = await prisma.trip.findUnique({ where: { id } });

    if (!trip) {
      throw new AppError('Trip not found', 404, 'TRIP_NOT_FOUND');
    }

    try {
      await prisma.trip.delete({ where: { id } });
    } catch (error: unknown) {
      throw new AppError(
        error instanceof Error ? error.message : 'Failed to delete trip',
        500,
        'DB_ERROR'
      );
    }
  }
}

export const tripManagerService = new TripManagerService();
