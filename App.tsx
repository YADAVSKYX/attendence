
import React, { useState, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import type { StudentProfile, TimeTableEntry, AttendanceRecord } from './types';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [profile, setProfile] = useLocalStorage<StudentProfile | null>('studentProfile', null);
  const [timetable, setTimetable] = useLocalStorage<TimeTableEntry[]>('studentTimetable', []);
  const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('studentAttendance', []);

  useEffect(() => {
    // Auto-cleanup attendance records older than 2 years
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    const recentAttendance = attendance.filter(record => new Date(record.date) >= twoYearsAgo);
    
    if (recentAttendance.length < attendance.length) {
      setAttendance(recentAttendance);
    }
  }, []); // Runs once on app load

  const handleSetupComplete = (newProfile: StudentProfile, newTimetable: TimeTableEntry[]) => {
    setProfile(newProfile);
    setTimetable(newTimetable);
  };
  
  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all your data? This action cannot be undone.")) {
        setProfile(null);
        setTimetable([]);
        setAttendance([]);
    }
  };

  return (
    <div className="ios-app min-h-screen font-sans text-slate-800 dark:text-slate-200">
      <div className="container mx-auto p-4 md:p-8">
        {!profile || timetable.length === 0 ? (
          <SetupWizard onSetupComplete={handleSetupComplete} />
        ) : (
          <Dashboard 
            profile={profile}
            timetable={timetable}
            attendance={attendance}
            setAttendance={setAttendance}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default App;
