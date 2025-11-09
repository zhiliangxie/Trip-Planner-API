import { config } from '../config/env';
import { Trip } from '../types/trip';
import { AppError } from '../utils/errors';
import { redis } from '../db/redis';
import { buildSearchCacheKey } from '../utils/helper';

/**
 * Service responsible for fetching available trips
 * Implements response caching via Redis and supports automatic retries
 */
export class SearchTripsService {
   /**
   * Fetches a list of trips from the external API between the specified origin and destination.
   * - Uses Redis caching to avoid redundant requests.
   * - Retries failed API calls.
   *
   * @async
   * @param {string} origin - IATA code of the origin airport (e.g. `"ATL"`).
   * @param {string} destination - IATA code of the destination airport (e.g. `"PEK"`).
   * @returns {Promise<Trip[]>} A promise that resolves to an array of trips.
   *
   * @throws {AppError} Thrown error when:
   * - The API returns a non-OK HTTP response (`FETCH_ERROR`).
   * - The request repeatedly fails after all retry attempts (`FETCH_RETRY_FAILED`).
   * - An unexpected error occurs after exhausting retries (`UNEXPECTED_ERROR`).
   *
   * @example
   * ```
   * const trips = await searchTripsService.findTrips('ATL', 'PEK');
   * ```
   */
  async findTrips(
    origin: string,
    destination: string
  ): Promise<Trip[]> {
    const sortBy = 'fastest';
    // Check items in the cache
    const cacheKey = buildSearchCacheKey(origin, destination);
    const cached = await redis.get(cacheKey);
    if (cached){
      return JSON.parse(cached) as Trip[];
    }

    const url = new URL(config.tripsApiUrl);
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    url.searchParams.set('sort_by', sortBy);

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

        const data = (await result.json()) as Trip[];
        await redis.set(cacheKey, JSON.stringify(data), 'EX', config.cacheTTL);
        return data;
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

        // Wait before retrying
        const delay = baseDelay * attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Throw unexpected erroors to handle exceptional cases
    throw new AppError('Unexpected retry failure', 500, 'UNEXPECTED_ERROR');
  }
}

export const searchTripsService = new SearchTripsService();
