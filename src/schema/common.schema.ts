/** @format */

export const responseErrorSchema: Record<string, any> = {
  $id: 'responseErrorSchema',
  type: 'object',
  properties: {
    error: {
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

export const requestParameterIdSchema: Record<string, any> = {
  $id: 'requestParameterIdSchema',
  type: 'object',
  properties: {
    id: {
      type: 'number'
    }
  },
  required: ['id']
};

export const requestQueryParameterSchema: Record<string, any> = {
  $id: 'requestQueryParameterSchema',
  type: 'object',
  properties: {
    search: {
      type: 'string',
      minLength: 3,
      maxLength: 9
    },
    order: {
      type: 'string',
      enum: ['newest', 'oldest']
    },
    scope: {
      type: 'array',
      collectionFormat: 'multi',
      items: {
        type: 'string'
      },
      default: ['user', 'posts']
    },
    page: {
      type: 'number',
      default: 1
    },
    size: {
      type: 'number',
      default: 10
    }
  },
  required: ['page', 'size']
};
