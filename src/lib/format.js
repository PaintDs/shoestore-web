export function formatCurrency(amount, locale = 'vi-VN') {
  const value = Number(amount) || 0;
  return `${value.toLocaleString(locale)}đ`;
}
