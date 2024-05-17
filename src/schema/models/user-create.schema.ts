/** @format */

// prettier-ignore
export const userCreateSchema: Record<string, any> = {
  $id: 'userCreateSchema',
  type: 'object',
  allOf: [
    {
      $ref: 'partsUserNameSchema#'
    },
    {
      $ref: 'partsUserEmailSchema#'
    },
    {
      $ref: 'partsUserPasswordSchema#'
    },
    {
      properties: {
        terms: {
          type: 'boolean',
          const: true
        },
        appearance: {
          type: 'object'
        }
      }
    }
  ]
};
