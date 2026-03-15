import { ref } from 'vue'
import { checkSkuAvailability } from '@/api/product'
import type { SubSku } from '@/types/product'

export function useSkuValidation() {
  const subSkuValidationErrors = ref<Record<number, string>>({})
  const editDialogSubSkuValidationErrors = ref<Record<number, string>>({})

  const validateSubSkuInput = async (
    index: number,
    tempSubSkus: SubSku[],
    parentSku: string | undefined,
    excludeId: string | undefined,
    errors: Record<number, string>,
  ) => {
    const subSku = tempSubSkus[index]
    if (!subSku) return

    subSku.subSku = (subSku.subSku || '').trim()
    const code = subSku.subSku

    // Clear previous error
    delete errors[index]

    if (!code) return

    // Check if it matches parent SKU
    if (parentSku && code === parentSku) {
      errors[index] = '親SKUと同じコードは使用できません'
      return
    }

    // Check for duplicates within the current list
    const duplicateIndex = tempSubSkus.findIndex((s, i) => i !== index && s.subSku === code)
    if (duplicateIndex >= 0) {
      errors[index] = 'このコードは既に入力されています'
      return
    }

    // Check against database
    try {
      const results = await checkSkuAvailability([code], excludeId)
      if (results[code] && !results[code].available) {
        const conflict = results[code]
        if (conflict.conflictType === 'mainSku') {
          errors[index] = `このコードは既存商品のSKU「${conflict.conflictProductSku}」と重複しています`
        } else {
          errors[index] = `このコードは商品「${conflict.conflictProductSku}」の子SKUと重複しています`
        }
      }
    } catch (error: any) {
      // SKUバリデーションエラー / SKU validation error
    }
  }

  const validateDialogSubSku = async (
    index: number,
    subSkus: SubSku[],
    parentSku: string | undefined,
    excludeId: string | undefined,
  ) => {
    await validateSubSkuInput(
      index,
      subSkus,
      parentSku,
      excludeId,
      subSkuValidationErrors.value,
    )
  }

  const validateEditDialogSubSku = async (
    index: number,
    subSkus: SubSku[],
    parentSku: string | undefined,
    excludeId: string | undefined,
  ) => {
    await validateSubSkuInput(
      index,
      subSkus,
      parentSku,
      excludeId,
      editDialogSubSkuValidationErrors.value,
    )
  }

  const validateMainSkuInput = async (sku: string, excludeId: string | undefined): Promise<string | null> => {
    const code = (sku || '').trim()
    if (!code) return null

    try {
      const results = await checkSkuAvailability([code], excludeId)
      if (results[code] && !results[code].available) {
        const conflict = results[code]
        if (conflict.conflictType === 'mainSku') {
          return `このSKUは既存商品「${conflict.conflictProductSku}」と重複しています`
        } else {
          return `このSKUは商品「${conflict.conflictProductSku}」の子SKUと重複しています`
        }
      }
    } catch (error: any) {
      // SKUバリデーションエラー / SKU validation error
    }
    return null
  }

  const resetDialogErrors = () => {
    subSkuValidationErrors.value = {}
  }

  const resetEditDialogErrors = () => {
    editDialogSubSkuValidationErrors.value = {}
  }

  return {
    subSkuValidationErrors,
    editDialogSubSkuValidationErrors,
    validateDialogSubSku,
    validateEditDialogSubSku,
    validateMainSkuInput,
    resetDialogErrors,
    resetEditDialogErrors,
  }
}
