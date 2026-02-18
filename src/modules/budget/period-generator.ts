/**
 * Period Generator
 * 
 * Pure function that generates budget period rows based on recurrence type.
 * No database dependencies - just date math.
 */

export type RecurrenceType = 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface PeriodData {
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string;   // ISO date string (YYYY-MM-DD)
  amount: string;    // Numeric string
}

/**
 * Generate budget periods based on recurrence type
 * 
 * @param startDate - ISO date string for the first period start
 * @param endDate - ISO date string for the last period end (only used for NONE)
 * @param recurrence - Type of recurrence
 * @param amount - Budget amount per period (as string)
 * @param count - Number of periods to generate (ignored for NONE)
 * @returns Array of period data objects
 */
export function generatePeriods(
  startDate: string,
  endDate: string | null,
  recurrence: RecurrenceType,
  amount: string,
  count: number = 12,
): PeriodData[] {
  if (recurrence === 'NONE') {
    // For NONE, generate exactly 1 period with user-provided dates
    if (!endDate) {
      throw new Error('endDate is required for NONE recurrence');
    }
    return [{ startDate, endDate, amount }];
  }

  // For recurring budgets, generate N periods
  const periods: PeriodData[] = [];
  let currentStart = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const currentEnd = calculatePeriodEnd(currentStart, recurrence);
    
    periods.push({
      startDate: formatDate(currentStart),
      endDate: formatDate(currentEnd),
      amount,
    });

    // Move to next period start (day after current end)
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return periods;
}

/**
 * Calculate the end date for a period based on recurrence type
 */
function calculatePeriodEnd(startDate: Date, recurrence: RecurrenceType): Date {
  const end = new Date(startDate);

  switch (recurrence) {
    case 'WEEKLY':
      end.setDate(end.getDate() + 6); // 7 days total (start + 6)
      break;

    case 'BIWEEKLY':
      end.setDate(end.getDate() + 13); // 14 days total
      break;

    case 'MONTHLY':
      // Move to next month, then back one day
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      break;

    default:
      throw new Error(`Unsupported recurrence type: ${recurrence}`);
  }

  return end;
}

/**
 * Format Date to ISO date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
