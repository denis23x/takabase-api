/** @format */

import fp from 'fastify-plugin';
import { AMQPClient } from '@cloudamqp/amqp-client';
import { lavinMQConfig } from '../config/lavinmq.config';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { AMQPBaseClient } from '@cloudamqp/amqp-client/types/amqp-base-client';
import type { AMQPChannel } from '@cloudamqp/amqp-client/types/amqp-channel';

//! Singleton

let amqpBaseClient: AMQPBaseClient = null;
let ampqChannel: AMQPChannel = null;

const lavinMQPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  if (!amqpBaseClient) {
    const amqpClient: AMQPClient = new AMQPClient(lavinMQConfig.url);

    try {
      amqpBaseClient = await amqpClient.connect();
      ampqChannel = await amqpBaseClient.channel();
    } catch (error: any) {
      throw new Error(error);
    }
  }

  //!Set instance

  fastifyInstance.decorate('lavinMQ', {
    baseClient: amqpBaseClient,
    channel: ampqChannel
  });

  //! Shutdown

  fastifyInstance.addHook('onClose', async (fastifyInstance: FastifyInstance): Promise<void> => {
    await fastifyInstance.lavinMQ.baseClient.close();
    await fastifyInstance.lavinMQ.channel.close();
  });

  // const consumeParams: ConsumeParams = {
  //   noAck: false
  // };
  //
  // const amqpConsumer: AMQPConsumer = await ampqQueue.subscribe(consumeParams, async (amqpMessage: AMQPMessage) => {
  //   console.log('testing', JSON.parse(amqpMessage.bodyToString()));
  // });
});

export default lavinMQPlugin;
