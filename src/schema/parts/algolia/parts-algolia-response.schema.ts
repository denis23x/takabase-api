/** @format */

export const partsAlgoliaResponseSchema: Record<string, any> = {
  $id: 'partsAlgoliaResponseSchema',
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        taskIDs: {
          type: 'array',
          items: {
            type: 'number'
          }
        },
        objectIDs: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      }
    },
    statusCode: {
      type: 'number'
    }
  }
};
