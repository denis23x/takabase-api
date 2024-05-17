/** @format */

export const partsUserNameSchema: Record<string, any> = {
  $id: 'partsUserNameSchema',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      default: 'batman',
      minLength: 4,
      maxLength: 32,
      pattern: '^(?!@)\\S{4,32}$'
    }
  }
};
