/** @format */

import { unfurl } from 'unfurl.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Metadata } from 'unfurl.js/dist/types';
import type { UtilitiesMetaDto } from '../../types/dto/utilities/utilities-meta';
import type { Opts } from 'unfurl.js/src/types';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'metadata',
    schema: {
      tags: ['Utilities'],
      description: 'Get SEO metadata',
      querystring: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            example: 'https://metatags.io'
          }
        },
        required: ['url']
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              $ref: 'metadataSchema#'
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<UtilitiesMetaDto>, reply: FastifyReply): Promise<any> {
      const url: string = request.query.url as string;
      const urlOptions: Opts = {
        oembed: true,
        compress: true,
        headers: {
          userAgent: request.headers['user-agent']
        }
      };

      await unfurl(url, urlOptions)
        .then((metadata: Metadata) => {
          return reply.status(200).send({
            data: metadata,
            statusCode: 200
          });
        })
        .catch((error: any) => {
          return reply.status(500).send({
            error: 'Internal Server Error',
            message: error.info.url,
            statusCode: 500
          });
        });
    }
  });
}
