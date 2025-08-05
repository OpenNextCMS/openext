'use client';

import { Clock, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function StatusBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSave = () => {
    setLastSaved(new Date());
  };

  return (
    <div className="h-6 border-t flex items-center justify-between px-4 text-xs text-muted-foreground bg-muted/20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatTime(currentTime)}</span>
        </div>

        {lastSaved && (
          <div className="flex items-center gap-1">
            <Save className="h-3 w-3" />
            <span>Last saved: {formatTime(lastSaved)}</span>
          </div>
        )}
      </div>

      <div>
        <span>Ready</span>
        <button onClick={handleSave} hidden></button>
      </div>
    </div>
  );
}
