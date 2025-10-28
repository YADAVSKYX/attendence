
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Gets the start and end dates of the week for a given date.
 * Assumes the week starts on Monday.
 * @param date - The date within the desired week.
 * @returns An object with the start and end dates of the week.
 */
export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  
  const start = new Date(d.setDate(diffToMonday));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Gets the full name of a month from its index (0-11).
 * @param monthIndex - The index of the month.
 * @returns The full name of the month.
 */
export const getMonthName = (monthIndex: number): string => {
  return MONTH_NAMES[monthIndex];
};


/**
 * Formats a Date object into a readable string "Month Day".
 * e.g., new Date('2024-10-21') becomes "Oct 21"
 * @param date - The Date object to format.
 * @returns A formatted string.
 */
export const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
