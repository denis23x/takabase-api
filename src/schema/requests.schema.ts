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
      type: 'number',
      minimum: 1
    }
  },
  required: ['id']
};

export const requestQueryParameterScopeSchema: Record<string, any> = {
  $id: 'requestQueryParameterScopeSchema',
  type: 'object',
  properties: {
    scope: {
      type: 'array',
      collectionFormat: 'multi',
      items: {
        type: 'string'
      },
      default: [],
      example: ['user', 'post', 'posts', 'category', 'categories']
    }
  }
};

export const requestQueryParameterSchema: Record<string, any> = {
  $id: 'requestQueryParameterSchema',
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 2,
      maxLength: 24
    },
    orderBy: {
      type: 'string',
      enum: ['newest', 'oldest']
    },
    page: {
      type: 'number',
      minimum: 1,
      default: 1
    },
    size: {
      type: 'number',
      minimum: 10,
      default: 10
    }
  },
  required: ['page', 'size']
};
