/**
 * A constant array of supported airport IATA codes.
 * 
 * These represent major international airports that the system recognizes
 * for trip creation, validation, and search operations.
 * 
 * @constant
 * @type {readonly string[]}
 * @example
 * // Example usage:
 * console.log(SUPPORTED_AIRPORTS.includes("ATL")); // true
 */
export const SUPPORTED_AIRPORTS = [
  "ATL", "PEK", "LAX", "DXB", "HND", "ORD", "LHR", "PVG", "CDG", "DFW",
  "AMS", "FRA", "IST", "CAN", "JFK", "SIN", "DEN", "ICN", "BKK", "SFO",
  "LAS", "CLT", "MIA", "KUL", "SEA", "MUC", "EWR", "MAD", "HKG", "MCO",
  "PHX", "IAH", "SYD", "MEL", "GRU", "YYZ", "LGW", "BCN", "MAN", "BOM",
  "DEL", "ZRH", "SVO", "DME", "JNB", "ARN", "OSL", "CPH", "HEL", "VIE"
] as const;

/**
 * Checks whether a given airport code is supported.
 *
 * @param {string} code - The IATA airport code to validate (case-nonsensitive).
 * @returns {boolean} Returns `true` if the airport is supported, otherwise `false`.
 * 
 * @example
 * isSupportedAirport("ATL"); // true
 * isSupportedAirport("123"); // false
 */
export function isSupportedAirport(code: string): boolean {
  return SUPPORTED_AIRPORTS.includes(code.toUpperCase() as any);
}

/**
 * Builds a unique Redis cache key for search trips.
 * 
 * Combines the origin, destination criteria to ensure
 * each trip search query is cached and retrieved independently.
 *
 * @param {string} origin - IATA code of the origin airport (e.g. `"ATL"`).
 * @param {string} destination - IATA code of the destination airport (e.g. `"PEK"`).
 * @returns {string} A Redis cache key in the format: `"trips:<origin>:<destination>"`.
 *
 * @example
 * ```
 * const key = buildSearchCacheKey('ATL', 'PEK');
 * // Result: "trips:ATL:PEK"
 * ```
 */
export const buildSearchCacheKey = (origin: string, destination: string) =>
  `trips:${origin}:${destination}`;

/**
 * The base Redis cache key used to cache data related with PostgreSQL
 * @constant
 * @type {string}
 *
 * @example
 * ```
 * await redis.del(CACHE_KEY_TRIPS); // Clears the saved trips cache
 * ```
 */
export const CACHE_KEY_TRIPS = 'trips:saved';