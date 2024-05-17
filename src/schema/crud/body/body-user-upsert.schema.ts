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
    email: {
      type: 'string',
      pattern: '^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&\'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    },
    password: {
      type: 'string',
      minLength: 6,
      maxLength: 32,
      pattern: '^(?=.*[\\d\\W]).{6,32}$'
    },
    avatar: {
      type: 'string',
      default: `https://firebasestorage.googleapis.com/v0/b/${JSON.parse(process.env.APP_SERVICE_ACCOUNT).project_id}.appspot.com/o/seed/1.webp`,
      pattern: '^https:\\/\\/firebasestorage\\.googleapis\\.com(:\\d+)?(\\/[-a-zA-Z0-9@:%._+~#=]*)*(\\?[;&amp;a-zA-Z0-9@:%_+.~#?&amp;\\/=]*)?(#[a-zA-Z0-9_@:%#?&amp;\\/=+-]*)?$',
      nullable: true
    },
    terms: {
      type: 'boolean',
      const: true
    },
    appearance: {
      type: 'object'
    }
  }
};
