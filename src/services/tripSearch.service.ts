import { Trip } from '../types/trip';
import { searchTripsService } from './searchTrips.service';
import { AppError } from '../utils/errors';
import { isSupportedAirport } from '../utils/helper';
import { SortBy } from '../types/sort';

/**
 * Service responsible for validating search inputs, fetching trips,
 * and applying sorting based on the chosen criteria.
 */
export class TripSearchService {
  /**
   * Retrieves and sorts available trips between the given origin and destination airports.
   * Performs input validation, calls the external trips API, and sorts results.
   *
   * @param {string} origin - IATA code of the origin airport (e.g. "ATL").
   * @param {string} destination - IATA code of the destination airport (e.g. "PEK").
   * @param {SortBy} sortBy - Sorting criteria for the results: `'fastest'` or `'cheapest'`.
   * @returns {Promise<Trip[]>} A promise that resolves with a sorted list of trips.
   *
   * @throws {AppError} If the airports are unsupported or the external API call fails.
   *
   * @example
   * ```
   * const trips = await tripSearchService.getTrips('ATL', 'PEK', 'cheapest');
   * ```
   */
  async getTrips(
    origin: string,
    destination: string,
    sortBy?: SortBy
  ): Promise<Trip[]> {
    // Normalize input
    origin = origin.toUpperCase();
    destination = destination.toUpperCase();
    const sortParam = sortBy ?? 'fastest';

    // Validate supported airports
    if (!isSupportedAirport(origin) || !isSupportedAirport(destination)) {
      throw new AppError(
        'Unsupported origin or destination',
        400,
        'UNSUPPORTED_AIRPORT'
      );
    }

    // Fetch trips from external API
    const trips = await searchTripsService.findTrips(origin, destination);

    // Sort and return
    return this.sortTrips(trips, sortParam);
  }

  /**
   * Sorts a list of trips according to the specified criteria.
   *
   * - `'fastest'`: Sorts by duration (shortest first), breaking ties by cost.
   * - `'cheapest'`: Sorts by cost (lowest first), breaking ties by duration.
   *
   * Sorting does not mutate the original array.
   *
   * @private
   * @param {Trip[]} trips - The list of trips to sort.
   * @param {SortBy} sortBy - The sorting criterion.
   * @returns {Trip[]} A new array of sorted trips.
   *
   * @example
   * ```
   * const sorted = tripSearchService['sortTrips'](trips, 'fastest');
   * ```
   */
  private sortTrips(trips: Trip[], sortBy: SortBy): Trip[] {
    return [...trips].sort((a, b) => {
      const primary =
        sortBy === 'fastest' ? a.duration - b.duration : a.cost - b.cost;

      // If equal by primary, break ties by the other metric
      if (primary === 0) {
        return sortBy === 'fastest'
          ? a.cost - b.cost
          : a.duration - b.duration;
      }

      return primary;
    });
  }
}

export const tripSearchService = new TripSearchService();
