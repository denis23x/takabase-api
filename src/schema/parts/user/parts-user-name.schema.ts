/** @format */

export const partsUsernameSchema: Record<string, any> = {
  $id: 'partsUsernameSchema',
  type: 'string',
  minLength: 4,
  maxLength: 32,
  pattern: '(?![0-9]+$).*'
};
