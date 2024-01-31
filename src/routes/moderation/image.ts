/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CreateAuthorization } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: 'image',
    schema: {
      tags: ['Moderation'],
      description: 'Moderates an image',
      // body: {
      //   anyOf: [
      //     {
      //       type: 'object',
      //       properties: {
      //         input: {
      //           type: 'string'
      //         }
      //       },
      //       required: ['input'],
      //       additionalProperties: false
      //     },
      //     {
      //       type: 'object',
      //       properties: {
      //         input: {
      //           type: 'array',
      //           items: {
      //             type: 'string'
      //           }
      //         }
      //       },
      //       required: ['input'],
      //       additionalProperties: false
      //     }
      //   ]
      // },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string'
                },
                model: {
                  type: 'string'
                }
              }
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        400: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<CreateAuthorization>, reply: FastifyReply): Promise<any> {
      return reply.status(500).send({
        error: 'Undefined',
        message: 'Undefined',
        statusCode: 500
      });

      // const imageBuffer: Buffer = await fs.readFileSync(path.join(process.cwd(), 'upload/model/test.jpeg'));
      //
      // const nsfwSpy: NsfwSpy = new NsfwSpy(path.join(process.cwd(), 'upload/model/model.json'));
      // await nsfwSpy.load();
      //
      // return await nsfwSpy
      //   .classifyImageFromByteArray(imageBuffer)
      //   .then((nsfwSpyResult: NsfwSpyResult) => {
      //     console.log('nsfwSpyResult', nsfwSpyResult);
      //
      //     return reply.status(200).send({
      //       data: nsfwSpyResult,
      //       statusCode: 200
      //     });
      //   })
      //   .catch((error: any) => {
      //     console.log('error', error);
      //
      //     return reply.status(500).send({
      //       error: 'Undefined',
      //       message: 'Undefined',
      //       statusCode: 500
      //     });
      //   });
    }
  });
}
