import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { tripManagerService } from '../services/tripManager.service';
import { SUPPORTED_AIRPORTS } from '../utils/helper';

/**
 * Registers all trip management routes in the Fastify application.
 *
 * This includes:
 * - `POST /api/trips` — Save a trip.
 * - `GET /api/trips` — List saved trips.
 * - `DELETE /api/trips/:id` — Delete a saved trip.
 *
 * @param {FastifyInstance} app - The Fastify instance to which routes will be attached.
 * @returns {Promise<void>} Resolves when routes are successfully registered.
 */
export async function tripsManagerRoutes(app: FastifyInstance) {
  /**
   * POST /api/trips
   *
   * Saves a trip with the given ID, origin, and destination.
   * Requires valid IATA codes for both airports.
   *
   * @response 201 - Trip successfully created.
   */
  app.post(
    '/api/trips',
    {
      schema: {
        description: 'Save a trip by ID, origin, and destination',
        tags: ['trips'],
        body: {
          type: 'object',
          required: ['tripId', 'origin', 'destination'],
          properties: {
            tripId: { type: 'string' },
            origin: { type: 'string', enum: SUPPORTED_AIRPORTS },
            destination: { type: 'string', enum: SUPPORTED_AIRPORTS },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              origin: { type: 'string' },
              destination: { type: 'string' },
              cost: { type: 'number' },
              duration: { type: 'number' },
              type: { type: 'string' },
              display_name: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { tripId: string; origin: string; destination: string };
      }>,
      reply: FastifyReply
    ) => {
      const { tripId, origin, destination } = request.body;

      const saved = await tripManagerService.saveTrip(tripId, origin, destination);
      reply.code(201);
      return saved;
    }
  );

  /**
   * GET /api/trips
   *
   * Retrieves a paginated list of saved trips.
   * Supports pagination via `limit` and `offset` query parameters.
   *
   * @query {number} [limit=20] - Maximum number of trips to return (1–100).
   * @query {number} [offset=0] - Number of trips to skip before listing.
   *
   * @response 200 - Array of saved trips.
   */
  app.get(
    '/api/trips',
    {
      schema: {
        description: 'List saved trips',
        tags: ['trips'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                origin: { type: 'string' },
                destination: { type: 'string' },
                cost: { type: 'number' },
                duration: { type: 'number' },
                type: { type: 'string' },
                display_name: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { limit?: number; offset?: number };
      }>
    ) => {
      const { limit = 20, offset = 0 } = request.query;
      return tripManagerService.listTrips(limit, offset);
    }
  );

  /**
   * DELETE /api/trips/:id
   *
   * Deletes a saved trip by its ID.
   *
   * @param {string} id - The ID of the trip to delete.
   * @response 204 - Trip successfully deleted (no content).
   */
  app.delete(
    '/api/trips/:id',
    {
      schema: {
        description: 'Delete a saved trip',
        tags: ['trips'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      await tripManagerService.deleteTrip(id);
      reply.code(204);
    }
  );
}
