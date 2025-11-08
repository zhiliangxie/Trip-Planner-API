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
