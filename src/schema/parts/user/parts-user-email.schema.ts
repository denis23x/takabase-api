/** @format */

// prettier-ignore
export const partsUserEmailSchema: Record<string, any> = {
  $id: 'partsUserEmailSchema',
  type: 'string',
  example: 'user@example.com',
  pattern: '^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&\'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
};
