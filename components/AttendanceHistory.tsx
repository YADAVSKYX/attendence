
import React, { useState, useMemo } from 'react';
import type { TimeTableEntry, AttendanceRecord, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../types';
import { getWeekRange, getMonthName, formatDate } from '../utils/date';
import BookOpenIcon from './icons/BookOpenIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface AttendanceHistoryProps {
  timetable: TimeTableEntry[];
  attendance: AttendanceRecord[];
}

type ViewMode = 'Weekly' | 'Monthly' | 'Yearly';

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ timetable, attendance }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('Weekly');
  const [currentDate, setCurrentDate] = useState(new Date());

  const subjects = useMemo(() => [...new Set(timetable.map(entry => entry.subject))], [timetable]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'Weekly') {
      newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
    } else if (viewMode === 'Monthly') {
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
    } else { // Yearly
      newDate.setFullYear(newDate.getFullYear() + (direction === 'prev' ? -1 : 1));
    }
    setCurrentDate(newDate);
  };

  const { filteredAttendance, dateLabel } = useMemo(() => {
    let startDate: Date, endDate: Date, label: string;

    if (viewMode === 'Weekly') {
      const { start, end } = getWeekRange(currentDate);
      startDate = start;
      endDate = end;
      label = `${formatDate(start)} - ${formatDate(end)}`;
    } else if (viewMode === 'Monthly') {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      label = `${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`;
    } else { // Yearly
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      endDate = new Date(currentDate.getFullYear(), 11, 31);
      label = `${currentDate.getFullYear()}`;
    }
    
    endDate.setHours(23, 59, 59, 999); // Ensure end date is inclusive

    const filtered = attendance.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });

    return { filteredAttendance: filtered, dateLabel: label };
  }, [viewMode, currentDate, attendance]);

  const renderSummaryView = () => {
    if (subjects.length === 0) {
        return <p className="text-center text-slate-500 dark:text-slate-400 py-8">No subjects to display.</p>
    }
    return (
      <div className="space-y-4">
        {subjects.map(subject => {
          const subjectClasses = timetable.filter(t => t.subject === subject);
          const totalHeld = filteredAttendance.filter(a => subjectClasses.some(sc => sc.id === a.timetableEntryId)).length;
          const totalPresent = filteredAttendance.filter(a => subjectClasses.some(sc => sc.id === a.timetableEntryId) && a.status === 'Present').length;
          const percentage = totalHeld > 0 ? Math.round((totalPresent / totalHeld) * 100) : 0;
          const barColor = percentage >= 75 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500';

          return (
            <div key={subject}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{subject}</span>
                <span className={`font-bold text-lg ${percentage >= 75 ? 'text-green-600 dark:text-green-400' : percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>{percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div className={`${barColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeeklyView = () => {
    const weekDays = DAYS_OF_WEEK.slice(1, 7); // Monday to Saturday
    const { start } = getWeekRange(currentDate);

    return (
      <div className="space-y-3">
        {weekDays.map((day, index) => {
          const dayDate = new Date(start);
          dayDate.setDate(start.getDate() + index);
          const dayStr = dayDate.toISOString().split('T')[0];
          
          const classesOnDay = timetable.filter(t => t.day === day);
          if (classesOnDay.length === 0) return null;

          return (
            <div key={day}>
              <p className="font-bold text-slate-600 dark:text-slate-300 mb-1">{day}</p>
              <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                {classesOnDay.map(cls => {
                  const record = attendance.find(a => a.date === dayStr && a.timetableEntryId === cls.id);
                  const status = record?.status;
                  let statusClass = 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300';
                  if (status === 'Present') statusClass = 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200';
                  if (status === 'Absent') statusClass = 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200';
                  
                  return (
                    <div key={cls.id} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700 dark:text-slate-200">{cls.subject}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                        {status || 'No Record'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        })}
        {timetable.filter(t => t.day !== 'Sunday').length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 py-8">No classes in timetable.</p>}
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
        <BookOpenIcon />
        Attendance History
      </h2>
      
      {/* View Mode Switcher */}
      <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1 mb-4">
        {(['Weekly', 'Monthly', 'Yearly'] as ViewMode[]).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 px-2 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === mode ? 'bg-white dark:bg-slate-900 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {mode}
          </button>
        ))}
      </div>

      {/* Date Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => handleDateChange('prev')} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronLeftIcon /></button>
        <span className="font-semibold text-center">{dateLabel}</span>
        <button onClick={() => handleDateChange('next')} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronRightIcon /></button>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto pr-2">
        {viewMode === 'Weekly' ? renderWeeklyView() : renderSummaryView()}
      </div>
    </div>
  );
};

export default AttendanceHistory;
