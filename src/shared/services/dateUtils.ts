/**
 * Date/Time Utilities using Day.js
 * Lightweight alternative to Moment.js
 */

import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(duration);
dayjs.extend(relativeTime);

/**
 * Format date for display
 */
export function formatDate(date: string | Date | Dayjs, format: string = 'MMM DD, YYYY'): string {
  return dayjs(date).format(format);
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date | Dayjs, format: string = 'MMM DD, YYYY HH:mm'): string {
  return dayjs(date).format(format);
}

/**
 * Get relative time (e.g., "2 days ago")
 */
export function getRelativeTime(date: string | Date | Dayjs): string {
  return dayjs(date).fromNow();
}

/**
 * Check if date is in the past
 */
export function isPast(date: string | Date | Dayjs): boolean {
  return dayjs(date).isBefore(dayjs());
}

/**
 * Check if date is in the future
 */
export function isFuture(date: string | Date | Dayjs): boolean {
  return dayjs(date).isAfter(dayjs());
}

/**
 * Check if license is expiring soon (within 30 days)
 */
export function isExpiringSoon(expiryDate: string | Date | Dayjs, days: number = 30): boolean {
  const today = dayjs();
  const expiry = dayjs(expiryDate);
  return expiry.isBetween(today, today.add(days, 'day'), null, '[]');
}

/**
 * Get days remaining until expiry
 */
export function getDaysRemaining(expiryDate: string | Date | Dayjs): number {
  return dayjs(expiryDate).diff(dayjs(), 'day');
}

/**
 * Format duration (e.g., "2 days 3 hours")
 */
export function formatDuration(startDate: string | Date | Dayjs, endDate: string | Date | Dayjs): string {
  const dur = dayjs.duration(dayjs(endDate).diff(dayjs(startDate)));
  return dur.format('D[d] H[h] m[m]');
}

/**
 * Get current date/time
 */
export function now(): Dayjs {
  return dayjs();
}

/**
 * Parse date string
 */
export function parseDate(dateString: string, format?: string): Dayjs {
  return format ? dayjs(dateString, format) : dayjs(dateString);
}

/**
 * Start of period
 */
export function startOfMonth(date?: string | Date | Dayjs): Dayjs {
  return dayjs(date).startOf('month');
}

export function startOfYear(date?: string | Date | Dayjs): Dayjs {
  return dayjs(date).startOf('year');
}

/**
 * End of period
 */
export function endOfMonth(date?: string | Date | Dayjs): Dayjs {
  return dayjs(date).endOf('month');
}

export function endOfYear(date?: string | Date | Dayjs): Dayjs {
  return dayjs(date).endOf('year');
}
