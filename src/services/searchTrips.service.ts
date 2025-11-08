import { config } from '../config/env';
import { Trip } from '../types/trip';
import { AppError } from '../utils/errors';
import { SortBy } from '../types/sort';

/**
 * Service responsible for fetching available trips
 * from the external trips API, with retry and backoff support.
 */
export class SearchTripsService {
  /**
   * Fetches a list of trips from the external API between the specified origin and destination.
   * Automatically retries failed requests up to a limited number of times.
   *
   * @param {string} origin - IATA code of the origin airport (e.g. "ATL").
   * @param {string} destination - IATA code of the destination airport (e.g. "PEK").
   * @param {SortBy} [sortBy='fastest'] - Sorting criteria for the trip results.
   * @returns {Promise<Trip[]>} A promise that resolves to an array of trips.
   *
   * @throws {AppError} If the external API request repeatedly fails or returns a non-OK response.
   *
   * @example
   * ```
   * const trips = await searchTripsService.getTrips('ATL', 'PEK', 'cheapest');
   * ```
   */
  async getTrips(
    origin: string,
    destination: string,
    sortBy?: SortBy
  ): Promise<Trip[]> {
    const sortParam = sortBy ?? 'fastest';

    const url = new URL(config.tripsApiUrl);
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    url.searchParams.set('sort_by', sortParam);

    const maxRetries = config.tripsMaxRetry;
    const baseDelay = 300;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fetch(url, {
          headers: {
            'x-api-key': config.tripsApiKey,
          },
        });

        if (!result.ok) {
          throw new AppError(
            `Failed to fetch trips (status: ${result.status})`,
            502,
            'FETCH_ERROR'
          );
        }

        return (await result.json()) as Trip[];
      } catch (err: unknown) {
        if (attempt === maxRetries) {
          throw new AppError(
            err instanceof Error
              ? `Failed after ${maxRetries} attempts: ${err.message}`
              : 'Unknown fetch error',
            502,
            'FETCH_RETRY_FAILED'
          );
        }

        // Wait before retrying (exponential backoff)
        const delay = baseDelay * attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Throw unexpected erroors to handle exceptional cases
    throw new AppError('Unexpected retry failure', 500, 'UNEXPECTED_ERROR');
  }
}

export const searchTripsService = new SearchTripsService();
