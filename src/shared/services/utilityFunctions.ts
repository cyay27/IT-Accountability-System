/**
 * Utility Functions using Lodash
 * Common utilities for performance optimization
 */

import { debounce, throttle, memoize, groupBy, uniqBy } from 'lodash';

/**
 * Debounce function for search inputs
 * Delays callback execution until user stops typing for specified ms
 */
export function createSearchDebounce(callback: (value: string) => void, delay: number = 300) {
  return debounce(callback, delay);
}

/**
 * Throttle function for scroll events
 * Ensures callback doesn't execute more than once per delay
 */
export function createScrollThrottle(callback: () => void, delay: number = 100) {
  return throttle(callback, delay);
}

/**
 * Memoize expensive computations
 */
export function memoizeExpensiveFunction<T extends (...args: any[]) => any>(fn: T): T {
  return memoize(fn) as T;
}

/**
 * Group records by a property
 */
export function groupRecords<T>(records: T[], property: keyof T): Record<string, T[]> {
  return groupBy(records, property);
}

/**
 * Remove duplicate records based on a property
 */
export function removeDuplicates<T>(records: T[], property?: keyof T): T[] {
  return property ? uniqBy(records, property) : Array.from(new Set(records));
}

/**
 * Paginate array
 */
export function paginate<T>(items: T[], pageNumber: number, pageSize: number): T[] {
  const startIndex = (pageNumber - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}

/**
 * Get total pages
 */
export function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize);
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

/**
 * Flatten nested array
 */
export function flattenArray<T>(arr: Array<T | T[]>): T[] {
  return arr.reduce<T[]>((acc, item) => {
    return acc.concat(Array.isArray(item) ? flattenArray(item) : item);
  }, []);
}

/**
 * Format file size (bytes to human readable)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sanitize string (remove special characters)
 */
export function sanitizeString(str: string): string {
  return str.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
}

/**
 * Create slug from string
 */
export function createSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
