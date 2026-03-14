import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from './errors'

describe('AppError', () => {
  it('sets default statusCode and code', () => {
    const err = new AppError('something broke')
    expect(err.message).toBe('something broke')
    expect(err.statusCode).toBe(500)
    expect(err.code).toBe('INTERNAL_ERROR')
    expect(err.details).toBeUndefined()
  })

  it('accepts custom statusCode, code, and details', () => {
    const err = new AppError('custom', 418, 'TEAPOT', { hint: 'brew' })
    expect(err.statusCode).toBe(418)
    expect(err.code).toBe('TEAPOT')
    expect(err.details).toEqual({ hint: 'brew' })
  })

  it('sets name to the constructor name', () => {
    const err = new AppError('test')
    expect(err.name).toBe('AppError')
  })

  it('is an instance of Error', () => {
    const err = new AppError('test')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('ValidationError', () => {
  it('has statusCode 400 and code VALIDATION_ERROR', () => {
    const err = new ValidationError('bad input')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.message).toBe('bad input')
  })

  it('inherits from AppError', () => {
    const err = new ValidationError('bad')
    expect(err).toBeInstanceOf(AppError)
    expect(err).toBeInstanceOf(Error)
  })

  it('passes details through', () => {
    const err = new ValidationError('bad', { field: 'email' })
    expect(err.details).toEqual({ field: 'email' })
  })
})

describe('NotFoundError', () => {
  it('has statusCode 404 and code NOT_FOUND', () => {
    const err = new NotFoundError('missing')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
  })

  it('inherits from AppError', () => {
    expect(new NotFoundError('x')).toBeInstanceOf(AppError)
  })
})

describe('ConflictError', () => {
  it('has statusCode 409 and code CONFLICT', () => {
    const err = new ConflictError('duplicate')
    expect(err.statusCode).toBe(409)
    expect(err.code).toBe('CONFLICT')
  })

  it('inherits from AppError', () => {
    expect(new ConflictError('x')).toBeInstanceOf(AppError)
  })
})

describe('UnauthorizedError', () => {
  it('has statusCode 401 and code UNAUTHORIZED', () => {
    const err = new UnauthorizedError()
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
    expect(err.message).toBe('Unauthorized')
  })

  it('accepts a custom message', () => {
    const err = new UnauthorizedError('token expired')
    expect(err.message).toBe('token expired')
  })

  it('inherits from AppError', () => {
    expect(new UnauthorizedError()).toBeInstanceOf(AppError)
  })
})

describe('ForbiddenError', () => {
  it('has statusCode 403 and code FORBIDDEN', () => {
    const err = new ForbiddenError()
    expect(err.statusCode).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
    expect(err.message).toBe('Forbidden')
  })

  it('accepts a custom message', () => {
    const err = new ForbiddenError('no access')
    expect(err.message).toBe('no access')
  })

  it('inherits from AppError', () => {
    expect(new ForbiddenError()).toBeInstanceOf(AppError)
  })
})
