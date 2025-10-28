
export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export interface StudentProfile {
  name: string;
  university: string;
  year: string;
  semester: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface TimeTableEntry {
  id: string;
  subject: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface AttendanceRecord {
  date: string; // "YYYY-MM-DD"
  timetableEntryId: string;
  status: 'Present' | 'Absent';
}