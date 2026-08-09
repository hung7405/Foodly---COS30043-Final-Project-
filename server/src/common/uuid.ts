import { NotFoundException } from '@nestjs/common'

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export function assertUuid(value: string, message = 'Resource not found'): void {
  if (!UUID_RE.test(value)) throw new NotFoundException(message)
}