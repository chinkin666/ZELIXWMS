import { z } from 'zod';

const digitsOnly = /^\d+$/;
const postalCodePattern = /^\d{7}$/;
const baseNo3 = /^\d{3}$/;

export const createOrderSourceCompanySchema = z.object({
  senderName: z.string().trim().min(1, '名称は必須です'),
  senderPostalCode: z
    .union([
      z.string().trim().regex(postalCodePattern, '郵便番号は7桁の数字で入力してください'),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  senderAddressPrefecture: z
    .union([
      z.string().trim().min(1),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  senderAddressCity: z
    .union([
      z.string().trim().min(1),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  senderAddressStreet: z
    .union([
      z.string().trim().min(1),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  senderPhone: z
    .union([
      z.string().trim().regex(digitsOnly, '電話番号は数字のみで入力してください'),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  hatsuBaseNo1: z
    .union([
      z.string().trim().regex(baseNo3, '発店コード1は3桁の数字で入力してください'),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  hatsuBaseNo2: z
    .union([
      z.string().trim().regex(baseNo3, '発店コード2は3桁の数字で入力してください'),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
});

export const updateOrderSourceCompanySchema = createOrderSourceCompanySchema.partial();

export type CreateOrderSourceCompanyInput = z.infer<typeof createOrderSourceCompanySchema>;
export type UpdateOrderSourceCompanyInput = z.infer<typeof updateOrderSourceCompanySchema>;

