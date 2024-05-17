/** @format */

export const querystringSearchUserNameSchema: Record<string, any> = {
  $id: 'querystringSearchUserNameSchema',
  type: 'object',
  properties: {
    userName: {
      type: 'string',
      minLength: 2,
      maxLength: 16,
      pattern: '^(?!@)\\S{2,}$'
    }
  }
};
