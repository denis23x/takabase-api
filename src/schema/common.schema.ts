/**
 * Simple global schemas that are going to be used across all of our app.
 *
 * See More: https://www.fastify.io/docs/latest/Reference/Validation-and-Serialization/
 *
 * @format
 */

// Just a single response object including a message
export const messageSchema = {
  $id: 'messageResponseSchema',
  type: 'object',
  properties: {
    message: { type: 'string' }
  }
};

// Used to validate/match URLS that include an ':id' param
export const paramIdSchema = {
  $id: 'paramIdSchema',
  type: 'object',
  properties: {
    id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
  },
  required: ['id']
};
