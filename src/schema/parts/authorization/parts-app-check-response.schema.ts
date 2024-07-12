/** @format */

export const partsAppCheckResponseSchema: Record<string, any> = {
  $id: 'partsAppCheckResponseSchema',
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        token: {
          type: 'string'
        },
        ttlMillis: {
          type: 'number'
        },
        expireTimeMillis: {
          type: 'number'
        }
      }
    },
    statusCode: {
      type: 'number'
    }
  }
};
