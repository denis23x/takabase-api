/** @format */

import type { AMQPBaseClient } from '@cloudamqp/amqp-client/types/amqp-base-client';

declare module 'fastify' {
  interface FastifyInstance {
    lavinMQ: AMQPBaseClient;
    lavinMQPlugin: {
      setImageListMoveToTemp: (postPath: string) => void;
    };
  }
}

export {};
