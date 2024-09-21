/** @format */

import fp from 'fastify-plugin';
import { AMQPClient } from '@cloudamqp/amqp-client';
import { lavinMQConfig } from '../config/lavinmq.config';
import type { ConsumeParams } from '@cloudamqp/amqp-client';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { AMQPBaseClient } from '@cloudamqp/amqp-client/types/amqp-base-client';
import type { AMQPChannel } from '@cloudamqp/amqp-client/types/amqp-channel';
import type { AMQPQueue } from '@cloudamqp/amqp-client/types/amqp-queue';
import type { AMQPMessage, QueueParams } from '@cloudamqp/amqp-client';

//! Singleton

let amqpBaseClient: AMQPBaseClient = null;
let ampqChannel1: AMQPChannel = null;

const lavinMQPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  if (!amqpBaseClient) {
    const amqpClient: AMQPClient = new AMQPClient(lavinMQConfig.url);

    try {
      amqpBaseClient = await amqpClient.connect();
      ampqChannel1 = await amqpBaseClient.channel();

      const queueParams: QueueParams = {
        durable: false
      };

      const consumeParams: ConsumeParams = {
        noAck: false
      };

      //! 1
      ampqChannel1
        .queue('setImageListMoveToTemp', queueParams)
        .then((amqpQueue: AMQPQueue) => {
          amqpQueue.subscribe(consumeParams, async (amqpMessage: AMQPMessage) => {
            const body: string = amqpMessage.bodyToString();
            const imageList: string[] = JSON.parse(body);

            // Move any images by url to the /temp, and it will be erased in 24 hours
            await fastifyInstance.storagePlugin.setImageListMove(imageList, 'temp');

            // Acknowledge the message
            await amqpMessage.ack();
          });
        })
        .catch((error: any) => console.error(error));
    } catch (error: any) {
      throw new Error(error);
    }
  }

  //! Set instance

  fastifyInstance.decorate('lavinMQ', amqpBaseClient);

  fastifyInstance.decorate('lavinMQPlugin', {
    setImageListMoveToTemp: (imageList: string): void => {
      // Charging the queue
      ampqChannel1.basicPublish('', 'setImageListMoveToTemp', imageList);
    }
  });

  //! Shutdown

  fastifyInstance.addHook('onClose', async (fastifyInstance: FastifyInstance): Promise<void> => {
    await fastifyInstance.lavinMQ.close();

    // Close channels
    await ampqChannel1.close();
  });
});

export default lavinMQPlugin;
