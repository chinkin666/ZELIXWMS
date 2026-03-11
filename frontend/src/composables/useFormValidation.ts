import { ref, computed, type Ref } from 'vue'

export interface ValidationRule {
  required?: boolean
  email?: boolean
  minLength?: number
  pattern?: RegExp
  message?: string
}

export type ValidationSchema<T extends Record<string, any>> = {
  [K in keyof T]?: ValidationRule
}

export function useFormValidation<T extends Record<string, any>>(
  form: T,
  schema: ValidationSchema<T>
) {
  const errors: Ref<Partial<Record<keyof T, string>>> = ref({})
  const touched: Ref<Partial<Record<keyof T, boolean>>> = ref({})

  function validateField(field: keyof T): string | null {
    const rule = schema[field]
    if (!rule) return null

    const value = form[field]

    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return rule.message || 'This field is required'
    }

    if (rule.email && value && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address'
      }
    }

    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return `Minimum ${rule.minLength} characters required`
    }

    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || 'Invalid format'
    }

    return null
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof T, string>> = {}
    let isValid = true

    for (const field in schema) {
      const error = validateField(field)
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    }

    errors.value = newErrors
    return isValid
  }

  function touchField(field: keyof T) {
    ;(touched.value as Record<keyof T, boolean>)[field] = true
    const error = validateField(field)
    if (error) {
      ;(errors.value as Record<keyof T, string>)[field] = error
    } else {
      delete (errors.value as Record<keyof T, string | undefined>)[field]
    }
  }

  function resetValidation() {
    errors.value = {}
    touched.value = {}
  }

  const isValid = computed(() => {
    for (const field in schema) {
      if (validateField(field)) return false
    }
    return true
  })

  function isRequired(field: keyof T): boolean {
    return !!schema[field]?.required
  }

  return {
    errors,
    touched,
    validate,
    touchField,
    resetValidation,
    isValid,
    isRequired,
  }
}
