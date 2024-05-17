/** @format */

export const partsUserNameSchema: Record<string, any> = {
  $id: 'partsUserNameSchema',
  type: 'object',
  properties: {
    userName: {
      type: 'string',
      minLength: 2,
      maxLength: 16,
      pattern: '^(?!@)\\S{2,16}$'
    }
  }
};
