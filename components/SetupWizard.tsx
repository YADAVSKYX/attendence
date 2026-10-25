import React, { useState, useCallback } from 'react';
import type { StudentProfile, TimeTableEntry, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../types';
import { scanTimetable, getUniversityCoordinates } from '../services/geminiService';
import UploadIcon from './icons/UploadIcon';
import LocationMarkerIcon from './icons/LocationMarkerIcon';

interface SetupWizardProps {
  onSetupComplete: (profile: StudentProfile, timetable: TimeTableEntry[]) => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<StudentProfile>({
    name: '',
    university: '',
    year: '',
    semester: '',
  });
  const [timetable, setTimetable] = useState<TimeTableEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState({
    subject: '',
    day: 'Monday' as DayOfWeek,
    startTime: '09:00',
    endTime: '10:00',
  });
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
     if (name === 'university') {
        setLocationStatus('idle');
        setShowManualLocation(false);
        setManualCoords({lat: '', lng: ''});
        // Clear location from profile if university name changes
        setProfile(prev => {
            const { location, ...rest } = prev;
            return rest;
        });
    }
  };
  
  const handleManualCoordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newCoords = { ...manualCoords, [name]: value };
    setManualCoords(newCoords);

    const latNum = parseFloat(newCoords.lat);
    const lngNum = parseFloat(newCoords.lng);

    if (!isNaN(latNum) && !isNaN(lngNum)) {
        setProfile(prev => ({ ...prev, location: { lat: latNum, lng: lngNum } }));
        setLocationStatus('success');
    } else {
        // Clear location if inputs become invalid
        setProfile(prev => {
            const { location, ...rest } = prev;
            return rest;
        });
        setLocationStatus('error');
    }
  }

  const handleUniversityBlur = useCallback(async () => {
    if (!profile.university || profile.location) return;

    setIsLocating(true);
    setLocationStatus('idle');
    const coords = await getUniversityCoordinates(profile.university);
    if (coords) {
        setProfile(prev => ({ ...prev, location: coords }));
        setLocationStatus('success');
    } else {
        setLocationStatus('error');
    }
    setIsLocating(false);
  }, [profile.university, profile.location]);
  
  const handleTimetableEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentEntry(prev => ({ ...prev, [name]: value }));
  };

  const addTimetableEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentEntry.subject) {
      setTimetable([...timetable, { ...currentEntry, id: crypto.randomUUID() }]);
      setCurrentEntry({ subject: '', day: 'Monday', startTime: '09:00', endTime: '10:00' });
    }
  };

  const removeTimetableEntry = (id: string) => {
    setTimetable(timetable.filter(entry => entry.id !== id));
  };
  
  const nextStep = () => {
    if (profile.name && profile.university && profile.year && profile.semester) {
        setStep(2);
    } else {
        alert("Please fill out all profile fields.");
    }
  };

  const finishSetup = () => {
    if (timetable.length > 0) {
      onSetupComplete(profile, timetable);
    } else {
        alert("Please add at least one class to your timetable.");
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
          setUploadedFile(file);
          setScanError(null);
          setFilePreview(URL.createObjectURL(file));
      } else {
          setScanError("Please upload an image file (e.g., PNG, JPG). For PDFs, kindly convert to an image first.");
          setUploadedFile(null);
          setFilePreview(null);
      }
      e.target.value = ''; // Reset file input
    }
  };
  
  const handleScanTimetable = async () => {
    if (!uploadedFile) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const base64Data = await fileToBase64(uploadedFile);
      const fileData = { mimeType: uploadedFile.type, data: base64Data };
      const scannedEntries = await scanTimetable(fileData);
      
      const newEntries = scannedEntries
        .filter(entry => DAYS_OF_WEEK.includes(entry.day as DayOfWeek)) // Ensure day is valid
        .map(entry => ({...entry, id: crypto.randomUUID()}));

      const combined = [...timetable];
      newEntries.forEach(newEntry => {
          if (!combined.some(existing => 
              existing.subject === newEntry.subject && 
              existing.day === newEntry.day &&
              existing.startTime === newEntry.startTime
          )) {
              combined.push(newEntry as TimeTableEntry);
          }
      });
      setTimetable(combined.sort((a,b) => DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day) || a.startTime.localeCompare(b.startTime)));
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "An unknown error occurred during scanning.");
    } finally {
      setIsScanning(false);
      setUploadedFile(null);
      setFilePreview(null);
    }
  };

  return (
    <div className="ios-setup max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-10 transition-all duration-300">
      <h1 className="text-3xl md:text-4xl font-bold text-center text-slate-800 dark:text-white mb-2">Welcome!</h1>
      <p className="text-center text-slate-500 dark:text-slate-400 mb-8">Let's set up your attendance tracker.</p>

      <div className="flex justify-center items-center mb-8">
        <div className={`flex items-center ${step >= 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-400'}`}>1</div>
          <span className="ml-2 font-semibold">Profile</span>
        </div>
        <div className={`flex-1 h-1 mx-4 rounded ${step > 1 ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
        <div className={`flex items-center ${step >= 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= 2 ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-400'}`}>2</div>
          <span className="ml-2 font-semibold">Timetable</span>
        </div>
      </div>
      
      {step === 1 && (
        <div className="animate-fade-in-up">
          <h2 className="text-2xl font-semibold mb-6 text-center">Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="name">Full Name</label>
              <input type="text" id="name" name="name" value={profile.name} onChange={handleProfileChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Jane Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="university">University/College</label>
              <input type="text" id="university" name="university" value={profile.university} onChange={handleProfileChange} onBlur={handleUniversityBlur} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., State University" />
                <div className="mt-1">
                    {!showManualLocation ? (
                        <div className="h-5 text-sm">
                            {isLocating && <span className="text-slate-500">Finding location...</span>}
                            {locationStatus === 'success' && !isLocating && <span className="text-green-600 dark:text-green-400 font-semibold">✓ Location Found!</span>}
                            {locationStatus === 'error' && !isLocating && (
                                <span className="text-red-500 dark:text-red-400">
                                    Could not find location.
                                    <button onClick={() => setShowManualLocation(true)} className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                        Set manually?
                                    </button>
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="mt-2 p-4 bg-slate-100 dark:bg-slate-700/80 rounded-lg animate-fade-in-up">
                            <p className="text-sm mb-2 text-slate-600 dark:text-slate-300">
                                Find coordinates on{' '}
                                <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Google Maps</a> or{' '}
                                <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">OpenStreetMap</a>.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label htmlFor="lat" className="block text-xs font-medium text-slate-500 dark:text-slate-400">Latitude</label>
                                    <input type="number" id="lat" name="lat" step="any" value={manualCoords.lat} onChange={handleManualCoordsChange} className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md" placeholder="e.g., 34.0522" />
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="lng" className="block text-xs font-medium text-slate-500 dark:text-slate-400">Longitude</label>
                                    <input type="number" id="lng" name="lng" step="any" value={manualCoords.lng} onChange={handleManualCoordsChange} className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md" placeholder="e.g., -118.2437" />
                                </div>
                            </div>
                            {locationStatus === 'success' && profile.location && <span className="text-green-600 dark:text-green-400 text-sm mt-2 block font-semibold">✓ Location Saved!</span>}
                        </div>
                    )}
                </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="year">Year</label>
              <input type="text" id="year" name="year" value={profile.year} onChange={handleProfileChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., 2nd" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="semester">Semester</label>
              <input type="text" id="semester" name="semester" value={profile.semester} onChange={handleProfileChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., 4th" />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button onClick={nextStep} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in-up">
          <h2 className="text-2xl font-semibold mb-6 text-center">Weekly Timetable</h2>
          
          {/* AI Scanner */}
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg mb-6 border border-slate-200 dark:border-slate-600">
             <h3 className="text-lg font-semibold mb-3 text-center">Tired of typing? Scan it!</h3>
             <div className="flex flex-col items-center gap-4">
                <label htmlFor="timetable-upload" className="w-full max-w-sm cursor-pointer text-center px-4 py-3 bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 font-semibold rounded-lg border-2 border-dashed border-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-500 transition-colors flex items-center justify-center gap-3">
                    <UploadIcon />
                    {uploadedFile ? 'Change Image' : 'Upload Timetable Image'}
                </label>
                <input id="timetable-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                
                {filePreview && (
                  <div className="w-full max-w-sm p-2 border rounded-lg bg-slate-200 dark:bg-slate-900">
                    <img src={filePreview} alt="Timetable preview" className="max-h-40 w-auto mx-auto rounded"/>
                  </div>
                )}
                
                <button onClick={handleScanTimetable} disabled={!uploadedFile || isScanning} className="w-full max-w-sm px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                  {isScanning ? 'Scanning with AI...' : 'Scan with AI'}
                </button>
                {scanError && <p className="text-sm text-red-500 dark:text-red-400 text-center">{scanError}</p>}
             </div>
          </div>
          
          <div className="relative text-center my-6">
            <hr className="border-slate-300 dark:border-slate-600"/>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-2 text-slate-500 font-semibold">OR</span>
          </div>

          {/* Manual Entry */}
          <form onSubmit={addTimetableEntry} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-slate-50 dark:bg-slate-700 p-4 rounded-lg mb-6">
             <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="subject">Subject (Manual)</label>
                <input type="text" id="subject" name="subject" value={currentEntry.subject} onChange={handleTimetableEntryChange} className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md" placeholder="e.g., Quantum Physics" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="day">Day</label>
                <select id="day" name="day" value={currentEntry.day} onChange={handleTimetableEntryChange} className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md">
                    {DAYS_OF_WEEK.filter(d => d !== 'Sunday').map(day => <option key={day} value={day}>{day}</option>)}
                </select>
            </div>
            <div className="flex gap-2">
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="startTime">From</label>
                    <input type="time" id="startTime" name="startTime" value={currentEntry.startTime} onChange={handleTimetableEntryChange} className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="endTime">To</label>
                    <input type="time" id="endTime" name="endTime" value={currentEntry.endTime} onChange={handleTimetableEntryChange} className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md" />
                </div>
            </div>
            <button type="submit" className="w-full px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600">Add Class</button>
          </form>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {timetable.length === 0 ? <p className="text-center text-slate-500 dark:text-slate-400 py-4">Your timetable is empty. Add a class above.</p> :
            timetable.map(entry => (
              <div key={entry.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{entry.subject}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{entry.day}, {entry.startTime} - {entry.endTime}</p>
                </div>
                <button onClick={() => removeTimetableEntry(entry.id)} className="text-red-500 hover:text-red-700 font-semibold p-2">&times;</button>
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep(1)} className="px-6 py-2 bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-400 dark:hover:bg-slate-500">Back</button>
            <button onClick={finishSetup} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Finish Setup</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupWizard;