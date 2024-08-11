/** @format */

import type { AMQPBaseClient } from '@cloudamqp/amqp-client/types/amqp-base-client';
import type { AMQPChannel } from '@cloudamqp/amqp-client/types/amqp-channel';

declare module 'fastify' {
  interface FastifyInstance {
    lavinMQ: {
      baseClient: AMQPBaseClient;
      channel: AMQPChannel;
    };
  }
}

export {};
