import { describe, it, expect } from 'vitest';
import { formatMinor, mulDiv, parseMajorToMinor, parsePercentToBps, parseQuantityToMilli } from '../../src/lib/money.ts';

describe('money', () => {
  it('formats USD with cents and thousands separators', () => {
    expect(formatMinor(123450, 'USD')).toBe('$1,234.50');
    expect(formatMinor(5, 'USD')).toBe('$0.05');
    expect(formatMinor(-250, 'USD')).toBe('-$2.50');
  });
  it('formats KHR with no decimals', () => {
    expect(formatMinor(1234500, 'KHR')).toBe('៛1,234,500');
    expect(formatMinor(0, 'KHR')).toBe('៛0');
  });
  it('parses major units without floating point error', () => {
    expect(parseMajorToMinor('19.99', 'USD')).toBe(1999);
    expect(parseMajorToMinor('0.1', 'USD')).toBe(10);
    expect(parseMajorToMinor('1,234.5', 'USD')).toBe(123450);
    expect(parseMajorToMinor('4000', 'KHR')).toBe(4000);
    expect(parseMajorToMinor('1.234', 'USD')).toBe(null);
    expect(parseMajorToMinor('1.50', 'KHR')).toBe(null);
    expect(parseMajorToMinor('abc', 'USD')).toBe(null);
  });
  it('rounds half away from zero in mulDiv', () => {
    expect(mulDiv(1, 1, 2)).toBe(1);
    expect(mulDiv(-1, 1, 2)).toBe(-1);
    expect(mulDiv(1, 1, 3)).toBe(0);
    expect(mulDiv(10000000000, 10000, 10000)).toBe(10000000000);
  });
  it('parses percent and quantity', () => {
    expect(parsePercentToBps('10')).toBe(1000);
    expect(parsePercentToBps('7.5')).toBe(750);
    expect(parsePercentToBps('7.555')).toBe(null);
    expect(parseQuantityToMilli('1.5')).toBe(1500);
    expect(parseQuantityToMilli('3')).toBe(3000);
  });
});
