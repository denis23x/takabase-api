/** @format */

export const responseErrorSchema: Record<string, any> = {
  $id: 'responseErrorSchema',
  type: 'object',
  properties: {
    error: {
      type: 'string'
    },
    code: {
      type: 'string'
    },
    message: {
      type: 'string'
    },
    statusCode: {
      type: 'number'
    }
  }
};
