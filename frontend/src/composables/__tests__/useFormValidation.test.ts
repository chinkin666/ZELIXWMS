/**
 * フォームバリデーション コンポーザブル テスト / 表单验证组合式函数测试
 *
 * required, email, minLength, pattern ルールの検証動作をテストする。
 * 测试 required, email, minLength, pattern 规则的验证行为。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { reactive } from 'vue'
import { useFormValidation, type ValidationSchema } from '../useFormValidation'

// ─── テスト対象フォーム型 / 测试表单类型 ─────────────────────────────────────

interface TestForm {
  name: string
  email: string
  password: string
  phone: string
}

// ─── required ルール / required 规则 ─────────────────────────────────────────

describe('required ルール / required 规则', () => {
  it('空文字列はバリデーション失敗 / 空字符串验证失败', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { name: { required: true } }
    const { validate, errors } = useFormValidation(form, schema)

    const valid = validate()

    expect(valid).toBe(false)
    expect(errors.value.name).toBeTruthy()
  })

  it('空白のみはバリデーション失敗 / 仅空格验证失败', () => {
    const form = reactive<TestForm>({ name: '   ', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { name: { required: true } }
    const { validate } = useFormValidation(form, schema)

    expect(validate()).toBe(false)
  })

  it('値があればバリデーション成功 / 有值则验证成功', () => {
    const form = reactive<TestForm>({ name: 'Test', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { name: { required: true } }
    const { validate, errors } = useFormValidation(form, schema)

    expect(validate()).toBe(true)
    expect(errors.value.name).toBeUndefined()
  })

  it('カスタムエラーメッセージを使用できる / 可以使用自定义错误消息', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = {
      name: { required: true, message: '名前は必須です / 名称为必填项' },
    }
    const { validate, errors } = useFormValidation(form, schema)

    validate()

    expect(errors.value.name).toBe('名前は必須です / 名称为必填项')
  })
})

// ─── email ルール / email 规则 ───────────────────────────────────────────────

describe('email ルール / email 规则', () => {
  it('有効なメールアドレスはバリデーション成功 / 有效的邮箱地址验证成功', () => {
    const form = reactive<TestForm>({ name: '', email: 'user@example.com', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { email: { email: true } }
    const { validate } = useFormValidation(form, schema)

    expect(validate()).toBe(true)
  })

  it('無効なメールアドレスはバリデーション失敗 / 无效的邮箱地址验证失败', () => {
    const form = reactive<TestForm>({ name: '', email: 'not-an-email', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { email: { email: true } }
    const { validate, errors } = useFormValidation(form, schema)

    expect(validate()).toBe(false)
    expect(errors.value.email).toContain('valid email')
  })

  it('@マークがないメールアドレスは失敗 / 没有 @ 符号的邮箱失败', () => {
    const form = reactive<TestForm>({ name: '', email: 'userexample.com', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { email: { email: true } }
    const { validate } = useFormValidation(form, schema)

    expect(validate()).toBe(false)
  })

  it('空のメールアドレスは email ルール単体では成功 (required でない) / 空邮箱在仅 email 规则下成功（非 required）', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { email: { email: true } }
    const { validate } = useFormValidation(form, schema)

    expect(validate()).toBe(true)
  })
})

// ─── minLength ルール / minLength 规则 ───────────────────────────────────────

describe('minLength ルール / minLength 规则', () => {
  it('最小文字数未満はバリデーション失敗 / 少于最小字符数验证失败', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: 'ab', phone: '' })
    const schema: ValidationSchema<TestForm> = { password: { minLength: 8 } }
    const { validate, errors } = useFormValidation(form, schema)

    expect(validate()).toBe(false)
    expect(errors.value.password).toContain('8')
  })

  it('最小文字数以上はバリデーション成功 / 达到最小字符数验证成功', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '12345678', phone: '' })
    const schema: ValidationSchema<TestForm> = { password: { minLength: 8 } }
    const { validate } = useFormValidation(form, schema)

    expect(validate()).toBe(true)
  })

  it('ちょうど最小文字数でも成功 / 恰好达到最小字符数也成功', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: 'abcdefgh', phone: '' })
    const schema: ValidationSchema<TestForm> = { password: { minLength: 8 } }
    const { validate } = useFormValidation(form, schema)

    expect(validate()).toBe(true)
  })
})

// ─── pattern ルール / pattern 规则 ───────────────────────────────────────────

describe('pattern ルール / pattern 规则', () => {
  it('パターンに一致すればバリデーション成功 / 匹配模式验证成功', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '', phone: '090-1234-5678' })
    const schema: ValidationSchema<TestForm> = {
      phone: { pattern: /^\d{2,4}-\d{2,4}-\d{4}$/ },
    }
    const { validate } = useFormValidation(form, schema)

    expect(validate()).toBe(true)
  })

  it('パターンに一致しなければバリデーション失敗 / 不匹配模式验证失败', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '', phone: 'abc' })
    const schema: ValidationSchema<TestForm> = {
      phone: { pattern: /^\d{2,4}-\d{2,4}-\d{4}$/ },
    }
    const { validate, errors } = useFormValidation(form, schema)

    expect(validate()).toBe(false)
    expect(errors.value.phone).toBeTruthy()
  })
})

// ─── 複数ルール組み合わせ / 多规则组合 ──────────────────────────────────────

describe('複数ルール組み合わせ / 多规则组合', () => {
  it('全フィールドが有効な場合 isValid が true / 所有字段有效时 isValid 为 true', () => {
    const form = reactive<TestForm>({
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword',
      phone: '090-1234-5678',
    })
    const schema: ValidationSchema<TestForm> = {
      name: { required: true },
      email: { required: true, email: true },
      password: { required: true, minLength: 8 },
    }
    const { isValid } = useFormValidation(form, schema)

    expect(isValid.value).toBe(true)
  })

  it('一つでも無効ならば isValid が false / 任一字段无效则 isValid 为 false', () => {
    const form = reactive<TestForm>({
      name: 'Test User',
      email: 'invalid-email',
      password: 'securepassword',
      phone: '',
    })
    const schema: ValidationSchema<TestForm> = {
      name: { required: true },
      email: { required: true, email: true },
      password: { required: true, minLength: 8 },
    }
    const { isValid } = useFormValidation(form, schema)

    expect(isValid.value).toBe(false)
  })
})

// ─── touchField / フィールドタッチ ──────────────────────────────────────────

describe('touchField / フィールドタッチ', () => {
  it('タッチしたフィールドのエラーが設定される / 触摸的字段设置错误', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { name: { required: true } }
    const { touchField, errors, touched } = useFormValidation(form, schema)

    touchField('name')

    expect(touched.value.name).toBe(true)
    expect(errors.value.name).toBeTruthy()
  })

  it('有効なフィールドをタッチするとエラーがクリアされる / 触摸有效字段时清除错误', () => {
    const form = reactive<TestForm>({ name: 'Valid', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { name: { required: true } }
    const { touchField, errors } = useFormValidation(form, schema)

    touchField('name')

    expect(errors.value.name).toBeUndefined()
  })
})

// ─── resetValidation / バリデーションリセット ────────────────────────────────

describe('resetValidation / バリデーションリセット', () => {
  it('エラーとタッチ状態をクリアする / 清除错误和触摸状态', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { name: { required: true } }
    const { validate, resetValidation, errors, touched } = useFormValidation(form, schema)

    validate()
    expect(errors.value.name).toBeTruthy()

    resetValidation()

    expect(errors.value).toEqual({})
    expect(touched.value).toEqual({})
  })
})

// ─── isRequired ヘルパー / isRequired 辅助 ──────────────────────────────────

describe('isRequired / 必須判定ヘルパー', () => {
  it('required ルールがあるフィールドは true / 有 required 规则的字段返回 true', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { name: { required: true } }
    const { isRequired } = useFormValidation(form, schema)

    expect(isRequired('name')).toBe(true)
  })

  it('required ルールがないフィールドは false / 无 required 规则的字段返回 false', () => {
    const form = reactive<TestForm>({ name: '', email: '', password: '', phone: '' })
    const schema: ValidationSchema<TestForm> = { name: { required: true } }
    const { isRequired } = useFormValidation(form, schema)

    expect(isRequired('email')).toBe(false)
  })
})
