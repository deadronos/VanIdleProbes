/* eslint-disable no-console */
/**
 * Lightweight logger wrapper to centralize console usage.
 * This file intentionally uses console and is excluded from the 'no-console' rule.
 */

export const log = (...args: unknown[]): void => {
  if (typeof console !== 'undefined' && typeof console.log === 'function') {
    console.log(...args);
  }
};

export const warn = (...args: unknown[]): void => {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(...args);
  }
};

export const error = (...args: unknown[]): void => {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(...args);
  }
};
