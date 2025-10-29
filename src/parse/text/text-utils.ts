import type { PropertyArray } from '../../types';

/**
 * 数组合并工具函数
 * 将数组 b 的元素追加到数组 a 中
 */
export function append (a: PropertyArray[], b: string[]): void {
  for (let i = 0, j = a.length, l = b.length; i < l; i++, j++) {
    a[j] = b[i];
  }
}

/**
 * 字符串处理工具
 * 移除字符串两端的引号
 */
export function removeQuotes (str: string): string {
  return str.replace(/^"/, '').replace(/"$/, '');
}

/**
 * 字符串修剪工具
 * 移除字符串两端的空白字符
 */
export function trimString (str: string): string {
  return str.trim();
}

/**
 * 检查字符串是否为空
 */
export function isEmptyString (str: string): boolean {
  return str.length === 0;
}

/**
 * 安全的 parseInt
 */
export function safeParseInt (value: string): number | null {
  const parsed = parseInt(value);

  return isNaN(parsed) ? null : parsed;
}

/**
 * 安全的 parseFloat
 */
export function safeParseFloat (value: string): number | null {
  const parsed = parseFloat(value);

  return isNaN(parsed) ? null : parsed;
}