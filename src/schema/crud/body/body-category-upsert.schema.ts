/** @format */

// prettier-ignore
export const bodyCategoryUpsertSchema: Record<string, any> = {
  $id: 'bodyCategoryUpsertSchema',
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
      nullable: true,
      minLength: 16,
      maxLength: 192,
    }
  }
};
