
import React, { useState, useMemo } from 'react';
import type { StudentProfile, TimeTableEntry, AttendanceRecord, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../types';
import { getStudyTip } from '../services/geminiService';
import { getDistance } from '../utils/location';
import NotificationToast from './NotificationToast';
import AttendanceHistory from './AttendanceHistory'; // Import the new component

import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import ClockIcon from './icons/ClockIcon';
import CalendarIcon from './icons/CalendarIcon';
import SparklesIcon from './icons/SparklesIcon';
import LocationMarkerIcon from './icons/LocationMarkerIcon';


interface DashboardProps {
  profile: StudentProfile;
  timetable: TimeTableEntry[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  onReset: () => void;
}

interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'error';
}

const ON_CAMPUS_RADIUS_KM = 0.5; // 500 meters

const Dashboard: React.FC<DashboardProps> = ({ profile, timetable, attendance, setAttendance, onReset }) => {
  const [studyTip, setStudyTip] = useState('');
  const [isTipLoading, setIsTipLoading] = useState(false);
  const [verifyingLocationId, setVerifyingLocationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentDay: DayOfWeek = DAYS_OF_WEEK[today.getDay()];

  const todaysClasses = useMemo(() => {
    return timetable
      .filter(entry => entry.day === currentDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetable, currentDay]);

  const subjects = useMemo(() => {
    return [...new Set(timetable.map(entry => entry.subject))];
  }, [timetable]);

  const addNotification = (message: string, type: 'success' | 'error') => {
    const id = crypto.randomUUID();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  const handleAttendance = (timetableEntryId: string, status: 'Present' | 'Absent') => {
    if (status === 'Present' && profile.location) {
        verifyLocationAndMarkPresent(timetableEntryId, profile.location);
        return;
    }

    const record: AttendanceRecord = { date: todayStr, timetableEntryId, status };
    setAttendance(prev => {
      const filtered = prev.filter(r => !(r.date === todayStr && r.timetableEntryId === timetableEntryId));
      return [...filtered, record];
    });
  };

  const verifyLocationAndMarkPresent = (entryId: string, universityLocation: { lat: number; lng: number }) => {
    setVerifyingLocationId(entryId);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const distance = getDistance(universityLocation, userLocation);

        if (distance <= ON_CAMPUS_RADIUS_KM) {
          const record: AttendanceRecord = { date: todayStr, timetableEntryId: entryId, status: 'Present' };
          setAttendance(prev => {
            const filtered = prev.filter(r => !(r.date === todayStr && r.timetableEntryId === entryId));
            return [...filtered, record];
          });
          addNotification('Location verified! Attendance marked.', 'success');
        } else {
          addNotification('You must be on campus to mark attendance.', 'error');
        }
        setVerifyingLocationId(null);
      },
      (error) => {
        let message = 'Could not get your location.';
        if (error.code === 1) message = 'Location permission denied.';
        addNotification(message, 'error');
        setVerifyingLocationId(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getAttendanceStatus = (timetableEntryId: string) => {
    return attendance.find(r => r.date === todayStr && r.timetableEntryId === timetableEntryId)?.status;
  };
  
  const fetchStudyTip = async () => {
    setIsTipLoading(true);
    setStudyTip('');
    const tip = await getStudyTip(subjects);
    setStudyTip(tip);
    setIsTipLoading(false);
  };

  return (
    <>
      <div className="space-y-8 animate-fade-in-up">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Hi, {profile.name}!</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{profile.university} &bull; Year {profile.year}, Semester {profile.semester}</p>
          </div>
          <button onClick={onReset} className="px-4 py-2 text-sm bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-semibold rounded-lg hover:bg-red-200 dark:hover:bg-red-900">Reset Data</button>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              {/* Today's Classes */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                      <CalendarIcon />
                      Today's Schedule ({currentDay})
                      {profile.location && <span title="Location verification is active"><LocationMarkerIcon /></span>}
                  </h2>
                  {todaysClasses.length > 0 ? (
                  <div className="space-y-4">
                      {todaysClasses.map(entry => {
                      const status = getAttendanceStatus(entry.id);
                      const isVerifying = verifyingLocationId === entry.id;
                      return (
                          <div key={entry.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex flex-col justify-between gap-4">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
                                  <div>
                                      <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{entry.subject}</p>
                                      <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-sm">
                                          <ClockIcon />
                                          {entry.startTime} - {entry.endTime}
                                      </p>
                                  </div>
                                  <div className="flex gap-2 self-end sm:self-center">
                                      <button onClick={() => handleAttendance(entry.id, 'Present')} disabled={isVerifying} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 min-w-[120px] justify-center ${status === 'Present' ? 'bg-green-500 text-white scale-105 shadow-lg' : 'bg-slate-200 dark:bg-slate-600 hover:bg-green-200 dark:hover:bg-green-800'} ${isVerifying ? 'cursor-not-allowed' : ''}`}>
                                          {isVerifying ? 'Verifying...' : <><CheckIcon /> Present</>}
                                      </button>
                                      <button onClick={() => handleAttendance(entry.id, 'Absent')} disabled={isVerifying} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 min-w-[120px] justify-center ${status === 'Absent' ? 'bg-red-500 text-white scale-105 shadow-lg' : 'bg-slate-200 dark:bg-slate-600 hover:bg-red-200 dark:hover:bg-red-800'}`}>
                                          <XIcon /> Absent
                                      </button>
                                  </div>
                              </div>
                          </div>
                      );
                      })}
                  </div>
                  ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">No classes scheduled for today. Enjoy your day off!</p>
                  )}
              </div>

              {/* AI Study Tip */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
                   <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                      <SparklesIcon />
                      AI Study Tip
                  </h2>
                  {isTipLoading && <div className="text-center text-slate-500 dark:text-slate-400 py-4">Generating a smart tip for you...</div>}
                  {studyTip && !isTipLoading && <div className="p-4 bg-indigo-50 dark:bg-indigo-900/40 border-l-4 border-indigo-500 rounded-r-lg text-indigo-800 dark:text-indigo-200 mb-4 whitespace-pre-wrap">{studyTip}</div>}

                  <button onClick={fetchStudyTip} disabled={isTipLoading} className="w-full mt-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {isTipLoading ? 'Thinking...' : 'Get a New Tip'}
                  </button>
              </div>
          </div>

          {/* New Attendance History Component */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
              <AttendanceHistory timetable={timetable} attendance={attendance} />
          </div>
        </main>
      </div>
      
      {/* Notification Container */}
      <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50">
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
            {notifications.map(notification => (
                <NotificationToast
                    key={notification.id}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
