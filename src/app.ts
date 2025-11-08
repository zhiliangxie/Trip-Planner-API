import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifyError,
} from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { tripsSearchRoutes } from './routes/trips-search.routes';
import { tripsManagerRoutes } from './routes/trips-manager.routes';
import { AppError } from './utils/errors';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
  });

  // Swagger / OpenAPI
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Trip Planner API',
        version: '1.0.0',
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Routes
  await app.register(tripsSearchRoutes);
  await app.register(tripsManagerRoutes);

  // Error handler
  app.setErrorHandler((
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error }, 'AppError');
      reply.status(error.statusCode).send({
        message: error.message,
        code: error.code,
      });
      return;
    }

    request.log.error({ err: error }, 'Unexpected error');
    const statusCode = (error as any).statusCode ?? 500;
    reply.status(statusCode).send({
      message: error.message ?? 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  return app;
}
