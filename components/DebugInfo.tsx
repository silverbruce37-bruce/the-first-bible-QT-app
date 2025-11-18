import React, { useState } from 'react';

const DebugInfo: React.FC = () => {
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <button 
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 left-4 bg-gray-600 text-white p-2 rounded text-xs"
      >
        Debug
      </button>
    );
  }

  const envInfo = {
    VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY ? '***' + import.meta.env.VITE_GEMINI_API_KEY.slice(-4) : 'undefined',
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    NODE_ENV: import.meta.env.NODE_ENV,
  };

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-4 rounded max-w-md text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Debug Info</h3>
        <button onClick={() => setShowDebug(false)} className="text-red-400">×</button>
      </div>
      <div className="space-y-1">
        {Object.entries(envInfo).map(([key, value]) => (
          <div key={key}>
            <span className="text-blue-300">{key}:</span> {String(value)}
          </div>
        ))}
      </div>
      <div className="mt-2">
        <span className="text-blue-300">User Agent:</span> {navigator.userAgent.slice(0, 50)}...
      </div>
    </div>
  );
};

export default DebugInfo;