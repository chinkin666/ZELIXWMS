/**
 * Shared validation utilities for order fields
 * Unified validation logic used across ShipmentOrderCreate and ShipmentOrderConfirm
 */
import { getNestedValue } from './nestedObject'
import type { TableColumn } from '@/types/table'
import { getMinDeliveryDate } from './yamatoDeliveryDays'
import { getStringWidth } from './japaneseCharWidth'

// Validation rule constants
export const VALIDATION_RULES = {
  postalCode: /^\d{7}$/,           // 7 digits, no hyphen
  digitsOnly: /^\d+$/,             // Digits only (for phone numbers)
  deliveryTimeSlot: /^\d{4}$/,     // 4 digits (HHHH format)
  invoiceTypes: new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A']),
  coolTypes: new Set(['0', '1', '2']),
  // 送り状種類ごとのクール便対応: 0(発払い), 2(コレクト), 5(着払い) のみクール便（冷凍・冷蔵）対応
  coolSupportedInvoiceTypes: new Set(['0', '2', '5']),
  dateOnly: /^(?:\d{4}\/\d{2}\/\d{2}|\d{4}-\d{2}-\d{2})$/,
}

/**
 * 指定された送り状種類がクール便（冷凍・冷蔵）に対応しているかチェック
 */
export function isCoolTypeSupported(invoiceType: string): boolean {
  return VALIDATION_RULES.coolSupportedInvoiceTypes.has(invoiceType)
}

/**
 * 指定された送り状種類に対応するクール区分オプションを取得
 */
export function getCoolTypeOptionsForInvoiceType(invoiceType: string): Array<{ label: string; value: string }> {
  const allOptions = [
    { label: '通常', value: '0' },
    { label: 'クール冷凍', value: '1' },
    { label: 'クール冷蔵', value: '2' },
  ]
  if (isCoolTypeSupported(invoiceType)) {
    return allOptions
  }
  // クール便非対応の場合は「通常」のみ
  return [{ label: '通常', value: '0' }]
}

/**
 * Check if a value is considered empty
 */
export function isEmpty(value: any): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    value === '-' ||
    (Array.isArray(value) && value.length === 0)
  )
}

/**
 * Normalize a string value (trim whitespace)
 */
export function normalizeValue(value: any): any {
  return typeof value === 'string' ? value.trim() : value
}

/**
 * Core cell validation function
 * Validates a cell value against column constraints
 * Supports nested keys like 'recipient.postalCode' via getNestedValue
 */
export function validateCell(row: any, column: TableColumn): boolean {
  const dataKey = column.dataKey || column.key
  if (!dataKey) return true

  // Use getNestedValue to support nested keys like 'recipient.postalCode'
  const rawValue = getNestedValue(row, dataKey as string)
  const fieldType = column.fieldType
  const required = column.required

  // Normalize strings, treat placeholder '-' as empty
  const normalizedValue = normalizeValue(rawValue)
  const isPlaceholderDash = typeof normalizedValue === 'string' && normalizedValue === '-'

  // Unified empty check
  const valueIsEmpty =
    normalizedValue === undefined ||
    normalizedValue === null ||
    normalizedValue === '' ||
    isPlaceholderDash ||
    (Array.isArray(normalizedValue) && normalizedValue.length === 0)

  // Required field validation
  if (required && valueIsEmpty) {
    return false
  }

  // Field-specific validations (only when value is not empty)
  const isPostalCodeField = dataKey.toLowerCase().includes('postalcode')
  const isPhoneField = dataKey.toLowerCase().includes('phone')

  if (!valueIsEmpty) {
    // Postal code: must be exactly 7 digits
    if (isPostalCodeField) {
      if (typeof normalizedValue !== 'string' || !VALIDATION_RULES.postalCode.test(normalizedValue)) {
        return false
      }
    }

    // Phone: must be digits only
    if (isPhoneField) {
      if (typeof normalizedValue !== 'string' || !VALIDATION_RULES.digitsOnly.test(normalizedValue)) {
        return false
      }
    }

    // 市区郡町村: 24半角幅（12全角文字）以内
    if (dataKey === 'recipient.city' || dataKey === 'sender.city') {
      if (typeof normalizedValue === 'string' && getStringWidth(normalizedValue) > 24) {
        return false
      }
    }

    // 町・番地: 32半角幅（16全角文字）以内
    if (dataKey === 'recipient.street' || dataKey === 'sender.street') {
      if (typeof normalizedValue === 'string' && getStringWidth(normalizedValue) > 32) {
        return false
      }
    }

    // アパートマンション名: 32半角幅（16全角文字）以内
    if (dataKey === 'recipient.building' || dataKey === 'sender.building') {
      if (typeof normalizedValue === 'string' && getStringWidth(normalizedValue) > 32) {
        return false
      }
    }

    // Delivery time slot: "HHHH" format (startHH + endHH), 00-24, start < end
    if (dataKey === 'deliveryTimeSlot') {
      if (typeof normalizedValue !== 'string' || !VALIDATION_RULES.deliveryTimeSlot.test(normalizedValue)) {
        return false
      }
      const start = Number(normalizedValue.slice(0, 2))
      const end = Number(normalizedValue.slice(2, 4))
      if (!Number.isInteger(start) || !Number.isInteger(end)) return false
      if (start < 0 || start > 23) return false
      if (end < 1 || end > 24) return false
      if (!(start < end)) return false
    }

    // Invoice type: backend expects '0' | '8' | 'A'
    if (dataKey === 'invoiceType') {
      if (typeof normalizedValue !== 'string' || !VALIDATION_RULES.invoiceTypes.has(normalizedValue)) {
        return false
      }
    }

    // Cool type: backend expects '0' | '1' | '2' (optional)
    // クール便（'1', '2'）は invoiceType が 0, 2, 5 の場合のみ許可
    if (dataKey === 'coolType') {
      const s = typeof normalizedValue === 'number' ? String(normalizedValue) : String(normalizedValue)
      if (!VALIDATION_RULES.coolTypes.has(s)) return false
      // Cross-field validation: coolType '1' or '2' only allowed for invoice types 0, 2, 5
      if (s !== '0') {
        const invoiceType = getNestedValue(row, 'invoiceType')
        if (invoiceType && !VALIDATION_RULES.coolSupportedInvoiceTypes.has(String(invoiceType))) {
          return false
        }
      }
    }
  }

  // Type-specific validations (only when value is not empty)
  if (!valueIsEmpty) {
    if (fieldType === 'number') {
      // Allow string numbers, convert and validate
      const num = typeof normalizedValue === 'number' ? normalizedValue : Number(normalizedValue)
      if (typeof num !== 'number' || isNaN(num)) {
        return false
      }
      if (column.min !== undefined && num < column.min) {
        return false
      }
      if (column.max !== undefined && num > column.max) {
        return false
      }
    } else if (fieldType === 'boolean') {
      if (typeof normalizedValue !== 'boolean') {
        return false
      }
    } else if (fieldType === 'date') {
      if (typeof normalizedValue !== 'string' || isNaN(Date.parse(normalizedValue))) {
        return false
      }
    } else if (fieldType === 'dateOnly') {
      if (typeof normalizedValue !== 'string' || !VALIDATION_RULES.dateOnly.test(normalizedValue)) {
        return false
      }
      // お届け日: 今日・過去・ヤマト最短配達日より前は不可
      if (dataKey === 'deliveryDatePreference') {
        if (validateDeliveryDate(row) !== null) return false
      }
    } else if (fieldType === 'array') {
      if (!Array.isArray(normalizedValue)) {
        return false
      }
      // For products array, check each element's structure
      if (dataKey === 'products') {
        for (const item of normalizedValue) {
          if (!item || typeof item !== 'object') {
            return false
          }
          // 兼容新旧结构：inputSku（新）或 sku（旧）
          const sku = item.inputSku || item.sku
          if (required && (!sku || sku === '')) {
            return false
          }
          if (item.quantity !== undefined) {
            const qty = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity)
            if (typeof qty !== 'number' || isNaN(qty)) {
              return false
            }
            // backend: int, positive
            if (!Number.isInteger(qty) || qty <= 0) {
              return false
            }
          }
        }
      }
    }
  }

  return true
}

/**
 * お届け日のバリデーション（ヤマト運輸ルール準拠）
 * - 今日・過去の日付は不可
 * - 出荷予定日 + 最短配達日数より前は不可
 * @returns エラーメッセージ（正常なら null）
 */
export function validateDeliveryDate(row: any): string | null {
  const deliveryDate = row.deliveryDatePreference
  if (!deliveryDate || deliveryDate === '-' || deliveryDate === '最短' || deliveryDate === '最短日') return null

  const normalized = String(deliveryDate).replace(/\//g, '-').substring(0, 10)
  if (!VALIDATION_RULES.dateOnly.test(deliveryDate) && !VALIDATION_RULES.dateOnly.test(normalized)) return null

  const deliveryTime = new Date(normalized).getTime()
  if (isNaN(deliveryTime)) return null

  // 今日・過去の日付チェック
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (deliveryTime <= today.getTime()) {
    return 'お届け日は明日以降の日付を指定してください'
  }

  // ヤマト最短配達日チェック
  const shipPlanDate = row.shipPlanDate
  const senderPref = row.sender?.prefecture
  const recipientPref = row.recipient?.prefecture
  if (shipPlanDate) {
    const minDate = getMinDeliveryDate(shipPlanDate, senderPref, recipientPref)
    if (minDate) {
      const minTime = new Date(minDate).getTime()
      if (!isNaN(minTime) && deliveryTime < minTime) {
        const display = minDate.replace(/-/g, '/')
        return `お届け日は${display}以降を指定してください（ヤマト運輸の最短配達日数に基づく）`
      }
    }
  }

  return null
}

/**
 * 住所フィールドのバリデーション
 * @returns エラーメッセージ配列
 */
export function validateAddressFields(row: any): string[] {
  const messages: string[] = []
  const rCity = row.recipient?.city
  const rStreet = row.recipient?.street
  const rBuilding = row.recipient?.building
  const sCity = row.sender?.city
  const sStreet = row.sender?.street
  const sBuilding = row.sender?.building
  const rCityW = rCity ? getStringWidth(rCity) : 0
  const rStreetW = rStreet ? getStringWidth(rStreet) : 0
  const rBuildingW = rBuilding ? getStringWidth(rBuilding) : 0
  const sCityW = sCity ? getStringWidth(sCity) : 0
  const sStreetW = sStreet ? getStringWidth(sStreet) : 0
  const sBuildingW = sBuilding ? getStringWidth(sBuilding) : 0
  if (rCityW > 24) messages.push(`お届け先 市区郡町村が${rCityW}半角幅です（上限24半角幅＝全角12文字）`)
  if (rStreetW > 32) messages.push(`お届け先 町・番地が${rStreetW}半角幅です（上限32半角幅＝全角16文字）`)
  if (rBuildingW > 32) messages.push(`お届け先 アパートマンション名が${rBuildingW}半角幅です（上限32半角幅＝全角16文字）`)
  if (sCityW > 24) messages.push(`ご依頼主 市区郡町村が${sCityW}半角幅です（上限24半角幅＝全角12文字）`)
  if (sStreetW > 32) messages.push(`ご依頼主 町・番地が${sStreetW}半角幅です（上限32半角幅＝全角16文字）`)
  if (sBuildingW > 32) messages.push(`ご依頼主 アパートマンション名が${sBuildingW}半角幅です（上限32半角幅＝全角16文字）`)
  return messages
}

/**
 * Check if a row has any validation errors
 * @param row The row data to validate
 * @param columns The columns to validate against
 * @returns true if the row has validation errors
 */
export function hasRowErrors(row: any, columns: TableColumn[]): boolean {
  return columns.some((col) => !validateCell(row, col))
}
