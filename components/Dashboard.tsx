import React, { useMemo, useState } from 'react';
import type { StudentProfile, TimeTableEntry, AttendanceRecord, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../types';
import { getStudyTip } from '../services/geminiService';
import { getDistance } from '../utils/location';
import NotificationToast from './NotificationToast';
import AttendanceHistory from './AttendanceHistory';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';
import ClockIcon from './icons/ClockIcon';
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

const ON_CAMPUS_RADIUS_KM = 0.5;

const Icon = ({ children, className = 'h-5 w-5' }: { children: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    {children}
  </svg>
);

const Dashboard: React.FC<DashboardProps> = ({ profile, timetable, attendance, setAttendance, onReset }) => {
  const [studyTip, setStudyTip] = useState('');
  const [isTipLoading, setIsTipLoading] = useState(false);
  const [verifyingLocationId, setVerifyingLocationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentDay: DayOfWeek = DAYS_OF_WEEK[today.getDay()];
  const firstName = profile.name.trim().split(/\s+/)[0] || 'there';

  const todaysClasses = useMemo(() => timetable
    .filter(entry => entry.day === currentDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime)), [timetable, currentDay]);

  const subjects = useMemo(() => [...new Set(timetable.map(entry => entry.subject))], [timetable]);
  const totalMarked = attendance.length;
  const presentCount = attendance.filter(record => record.status === 'Present').length;
  const attendanceRate = totalMarked ? Math.round((presentCount / totalMarked) * 100) : 0;
  const todayPresent = attendance.filter(record => record.date === todayStr && record.status === 'Present').length;
  const todayMarked = attendance.filter(record => record.date === todayStr).length;

  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date();
    while (count < 30) {
      const date = cursor.toISOString().split('T')[0];
      const record = attendance.find(item => item.date === date);
      if (record?.status !== 'Present') break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [attendance]);

  const addNotification = (message: string, type: 'success' | 'error') => {
    setNotifications(prev => [...prev, { id: crypto.randomUUID(), message, type }]);
  };

  const saveAttendance = (timetableEntryId: string, status: 'Present' | 'Absent') => {
    const record: AttendanceRecord = { date: todayStr, timetableEntryId, status };
    setAttendance(prev => [...prev.filter(item => !(item.date === todayStr && item.timetableEntryId === timetableEntryId)), record]);
    addNotification(status === 'Present' ? 'Nice one — attendance logged.' : 'Marked as absent for today.', status === 'Present' ? 'success' : 'error');
  };

  const handleAttendance = (timetableEntryId: string, status: 'Present' | 'Absent') => {
    if (status === 'Present' && profile.location) {
      setVerifyingLocationId(timetableEntryId);
      navigator.geolocation.getCurrentPosition(
        position => {
          const distance = getDistance(profile.location!, { lat: position.coords.latitude, lng: position.coords.longitude });
          if (distance <= ON_CAMPUS_RADIUS_KM) {
            saveAttendance(timetableEntryId, 'Present');
          } else {
            addNotification('You need to be on campus to check in.', 'error');
          }
          setVerifyingLocationId(null);
        },
        error => {
          addNotification(error.code === 1 ? 'Location permission was denied.' : 'Could not verify your location.', 'error');
          setVerifyingLocationId(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
      return;
    }
    saveAttendance(timetableEntryId, status);
  };

  const getAttendanceStatus = (timetableEntryId: string) =>
    attendance.find(record => record.date === todayStr && record.timetableEntryId === timetableEntryId)?.status;

  const fetchStudyTip = async () => {
    setIsTipLoading(true);
    setStudyTip('');
    setStudyTip(await getStudyTip(subjects));
    setIsTipLoading(false);
  };

  const weekdayLabel = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="ios-dashboard min-h-screen pb-10 text-slate-100 animate-fade-in-up">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 text-lg font-black text-slate-950 shadow-lg shadow-cyan-500/20">A</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Attendence</p>
            <p className="text-xs text-slate-500">Your campus rhythm, simplified.</p>
          </div>
        </div>
        <button onClick={onReset} className="self-start rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-red-400/40 hover:text-red-300 sm:self-auto">Reset data</button>
      </header>

      <section className="mb-8 grid gap-6 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#18284d] via-[#15203d] to-[#10172d] p-7 shadow-2xl shadow-blue-950/30 sm:p-9">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-medium text-cyan-200">{weekdayLabel}, {dateLabel}</p>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Hey {firstName},<br /><span className="text-slate-300">let&apos;s keep your streak alive.</span></h1>
              </div>
              <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-3 sm:block">
                <Icon className="h-6 w-6 text-yellow-300"><path d="M12 3l1.9 5.7H20l-4.9 3.6 1.9 5.7-5-3.5-5 3.5 1.9-5.7L4 8.7h6.1L12 3z" /></Icon>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-8">
              <div><p className="text-5xl font-black text-white">{attendanceRate}<span className="text-2xl text-cyan-300">%</span></p><p className="mt-1 text-sm text-slate-400">overall attendance</p></div>
              <div className="h-12 w-px bg-white/10" />
              <div><p className="text-3xl font-black text-white">{streak}<span className="ml-1 text-xl">🔥</span></p><p className="mt-1 text-sm text-slate-400">day streak</p></div>
              <div className="ml-auto hidden text-right sm:block"><p className="text-sm font-semibold text-cyan-200">{profile.university}</p><p className="mt-1 text-xs text-slate-500">Year {profile.year} · Semester {profile.semester}</p></div>
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-[#151c31] p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between"><p className="text-sm font-bold uppercase tracking-wider text-slate-400">Today&apos;s pulse</p><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">{todayMarked ? 'On track' : 'Ready'}</span></div>
          <div className="mb-5 flex items-center gap-4">
            <div className="relative h-20 w-20">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36"><path className="text-slate-700" stroke="currentColor" strokeWidth="3.5" fill="none" d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831 15.9155 15.9155 0 1 1 0-31.831" /><path className="text-cyan-300" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeDasharray={`${todaysClasses.length ? (todayPresent / todaysClasses.length) * 100 : 0}, 100`} d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831 15.9155 15.9155 0 1 1 0-31.831" /></svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-black">{todayPresent}/{todaysClasses.length}</span>
            </div>
            <div><p className="font-bold text-white">Classes checked in</p><p className="mt-1 text-sm leading-5 text-slate-400">{todaysClasses.length - todayMarked > 0 ? `${todaysClasses.length - todayMarked} more to go today.` : 'You are all caught up.'}</p></div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-300"><span className="mr-2 text-yellow-300">✦</span>{attendanceRate >= 75 ? 'You are building a seriously solid semester.' : 'Small wins compound. Show up for the next class.'}</div>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Present', value: presentCount, icon: '✓', tone: 'text-emerald-300 bg-emerald-400/10' },
          { label: 'Total logged', value: totalMarked, icon: '◷', tone: 'text-cyan-300 bg-cyan-400/10' },
          { label: 'Classes today', value: todaysClasses.length, icon: '▦', tone: 'text-violet-300 bg-violet-400/10' },
          { label: 'Goal', value: '75%', icon: '★', tone: 'text-yellow-300 bg-yellow-400/10' },
        ].map(stat => <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#151c31] p-4"><div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ${stat.tone}`}>{stat.icon}</div><p className="text-2xl font-black text-white">{stat.value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{stat.label}</p></div>)}
      </div>

      <main className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-[2rem] border border-white/10 bg-[#151c31] p-5 shadow-xl sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Your day</p><h2 className="mt-1 text-2xl font-black text-white">Today&apos;s classes</h2></div>
            {profile.location && <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300"><LocationMarkerIcon /> Campus check-in on</span>}
          </div>
          <div className="mb-6 grid grid-cols-7 gap-1.5 sm:gap-2">
            {DAYS_OF_WEEK.slice(1).map(day => {
              const isToday = day === currentDay;
              const count = timetable.filter(item => item.day === day).length;
              return <div key={day} className={`rounded-xl p-2 text-center ${isToday ? 'bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-500'}`}><p className="text-[10px] font-bold uppercase">{day.slice(0, 3)}</p><p className={`mt-1 text-sm font-black ${isToday ? 'text-slate-950' : 'text-slate-300'}`}>{count}</p></div>;
            })}
          </div>
          {todaysClasses.length ? <div className="space-y-3">{todaysClasses.map(entry => {
            const status = getAttendanceStatus(entry.id);
            const isVerifying = verifyingLocationId === entry.id;
            return <div key={entry.id} className={`rounded-2xl border p-4 transition ${status === 'Present' ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : status === 'Absent' ? 'border-red-400/20 bg-red-400/[0.04]' : 'border-white/10 bg-white/[0.03]'} sm:flex sm:items-center sm:justify-between`}>
              <div className="mb-4 flex items-center gap-3 sm:mb-0"><div className={`h-2.5 w-2.5 rounded-full ${status === 'Present' ? 'bg-emerald-300' : status === 'Absent' ? 'bg-red-300' : 'bg-slate-600'}`} /><div><p className="font-bold text-white">{entry.subject}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><ClockIcon /> {entry.startTime} — {entry.endTime}</p></div></div>
              <div className="flex gap-2"><button onClick={() => handleAttendance(entry.id, 'Present')} disabled={isVerifying} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:flex-none ${status === 'Present' ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-emerald-400/20 hover:text-emerald-200'}`}>{isVerifying ? 'Checking…' : <><CheckIcon /> Present</>}</button><button onClick={() => handleAttendance(entry.id, 'Absent')} disabled={isVerifying} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:flex-none ${status === 'Absent' ? 'bg-red-400 text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-red-400/20 hover:text-red-200'}`}><XIcon /> Absent</button></div>
            </div>;
          })}</div> : <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center"><p className="text-3xl">☕</p><p className="mt-3 font-bold text-white">No classes today</p><p className="mt-1 text-sm text-slate-500">A perfect day to catch up or recharge.</p></div>}
        </section>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#23204a] to-[#171a35] p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2 text-violet-200"><SparklesIcon /><p className="text-xs font-bold uppercase tracking-[0.2em]">Smart nudge</p></div>
            {studyTip && !isTipLoading && <p className="mb-4 rounded-xl bg-white/10 p-4 text-sm leading-6 text-violet-100">{studyTip}</p>}
            {!studyTip && !isTipLoading && <p className="mb-5 text-sm leading-6 text-slate-300">Get a tiny, personalized study idea based on your current subjects.</p>}
            {isTipLoading && <p className="mb-5 text-sm text-violet-200">Finding your next small win…</p>}
            <button onClick={fetchStudyTip} disabled={isTipLoading} className="w-full rounded-xl bg-violet-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-200 disabled:opacity-60">{isTipLoading ? 'Thinking…' : 'Give me a nudge'}</button>
          </section>
          <div className="rounded-[2rem] border border-white/10 bg-[#151c31] p-2 shadow-xl"><AttendanceHistory timetable={timetable} attendance={attendance} /></div>
        </div>
      </main>

      <div aria-live="assertive" className="fixed inset-0 z-50 flex pointer-events-none items-end px-4 py-6 sm:items-start sm:p-6"><div className="flex w-full flex-col items-center space-y-3 sm:items-end">{notifications.map(notification => <NotificationToast key={notification.id} message={notification.message} type={notification.type} onClose={() => setNotifications(prev => prev.filter(item => item.id !== notification.id))} />)}</div></div>
    </div>
  );
};

export default Dashboard;
