/** @format */

// prettier-ignore
export const bodyUserUpsertSchema: Record<string, any> = {
  $id: 'bodyUserUpsertSchema',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      default: 'secret',
      minLength: 4,
      maxLength: 24,
      pattern: '^\\S{4,24}$'
    },
    description: {
      type: 'string',
      default: 'Dolor sit amet, co.',
      nullable: true,
      minLength: 16,
      maxLength: 192,
    },
    avatar: {
      type: 'string',
      default: `https://firebasestorage.googleapis.com/v0/b/${JSON.parse(process.env.APP_SERVICE_ACCOUNT).project_id}.appspot.com/o/seed/1.webp`,
      pattern: '^https:\\/\\/firebasestorage\\.googleapis\\.com(:\\d+)?(\\/[-a-zA-Z0-9@:%._+~#=]*)*(\\?[;&amp;a-zA-Z0-9@:%_+.~#?&amp;\\/=]*)?(#[a-zA-Z0-9_@:%#?&amp;\\/=+-]*)?$',
      nullable: true
    }
  }
};
