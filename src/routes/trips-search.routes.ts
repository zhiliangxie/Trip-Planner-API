import {
  FastifyInstance,
  FastifyRequest,
} from 'fastify';
import { tripSearchService } from '../services/tripSearch.service';
import { SortBy } from '../types/sort';
import { SUPPORTED_AIRPORTS } from '../utils/helper';

/**
 * Registers the route for searching trips between two airports.
 *
 * This includes:
 * - `GET /api/trips/search` — Search trip.
 *
 * @param {FastifyInstance} app - The Fastify instance used to register the route.
 * @returns {Promise<void>} Resolves when the route is successfully registered.
 */
export async function tripsSearchRoutes(app: FastifyInstance) {
  /**
   * GET /api/trips/search
   *
   * Searches for available trips between two airports.
   * If `sort_by` is not provided, results are sorted by `fastest` by default.
   *
   * @query {string} origin - IATA code of the origin airport (e.g. "ATL").
   * @query {string} destination - IATA code of the destination airport (e.g. "PEK").
   * @query {('fastest' | 'cheapest')} [sort_by='fastest'] - Sort order for the results.
   *
   * @response 200 - An array of available trip objects.
   */
  app.get(
    '/api/trips/search',
    {
      schema: {
        description:
          'Search trips between origin and destination. Results are sorted by fastest by default.',
        tags: ['trips'],
        querystring: {
          type: 'object',
          required: ['origin', 'destination'],
          properties: {
            origin: { type: 'string', enum: SUPPORTED_AIRPORTS },
            destination: { type: 'string', enum: SUPPORTED_AIRPORTS },
            sort_by: { type: 'string', enum: ['fastest', 'cheapest'] },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              required: [
                'id',
                'origin',
                'destination',
                'cost',
                'duration',
                'type',
                'display_name',
              ],
              properties: {
                id: { type: 'string' },
                origin: { type: 'string' },
                destination: { type: 'string' },
                cost: { type: 'number' },
                duration: { type: 'number' },
                type: { type: 'string' },
                display_name: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { origin: string; destination: string; sort_by?: SortBy };
      }>
    ) => {
      const { origin, destination, sort_by } = request.query;

      const trips = await tripSearchService.getTrips(origin, destination, sort_by);
      return trips;
    }
  );
}
