/** @format */

export const partsPostMarkdownSchema: Record<string, any> = {
  $id: 'partsPostMarkdownSchema',
  type: 'string',
  default: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam.',
  minLength: 64,
  maxLength: 8192
};
