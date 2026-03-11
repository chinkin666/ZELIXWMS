import { z } from 'zod';

const digitsOnly = /^\d+$/;
const postalCodePattern = /^\d{7}$/;
const baseNo3 = /^\d{3}$/;
const stripNonDigits = (v: string) => v.replace(/[-\s\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFF0D\u30FC\uFF70]/g, '');

export const createOrderSourceCompanySchema = z.object({
  senderName: z.string().trim().min(1, '名称は必須です'),
  senderPostalCode: z
    .union([
      z.string().trim().transform(stripNonDigits).pipe(z.string().regex(postalCodePattern, '郵便番号は7桁の数字で入力してください')),
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
      z.string().trim().transform(stripNonDigits).pipe(z.string().regex(digitsOnly, '電話番号は数字のみで入力してください')),
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

