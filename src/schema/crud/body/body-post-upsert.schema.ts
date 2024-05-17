/** @format */

// prettier-ignore
export const bodyPostUpsertSchema: Record<string, any> = {
  $id: 'bodyPostUpsertSchema',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      default: 'Vivamus odio.',
      minLength: 4,
      maxLength: 48
    },
    description: {
      type: 'string',
      default: 'Dolor sit amet, co.',
      minLength: 16,
      maxLength: 192
    },
    markdown: {
      type: 'string',
      default: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam.',
      minLength: 64,
      maxLength: 8192
    },
    image: {
      type: 'string',
      default: `https://firebasestorage.googleapis.com/v0/b/${JSON.parse(process.env.APP_SERVICE_ACCOUNT).project_id}.appspot.com/o/seed/1.webp`,
      pattern: '^https:\\/\\/firebasestorage\\.googleapis\\.com(:\\d+)?(\\/[-a-zA-Z0-9@:%._+~#=]*)*(\\?[;&amp;a-zA-Z0-9@:%_+.~#?&amp;\\/=]*)?(#[a-zA-Z0-9_@:%#?&amp;\\/=+-]*)?$',
      nullable: true
    },
    categoryId: {
      type: 'number',
      minimum: 1
    }
  }
};
