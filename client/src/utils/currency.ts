export function formatVND(amount: number): string {
  if (!Number.isFinite(amount)) return '0₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('₫', '₫')
}

export function formatVNDCompact(amount: number): string {
  if (!Number.isFinite(amount)) return '0₫'
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1).replace('.0', '') + 'M₫'
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1).replace('.0', '') + 'K₫'
  }
  return formatVND(amount)
}
