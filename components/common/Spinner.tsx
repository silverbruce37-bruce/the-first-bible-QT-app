import React from 'react';
import { useLanguage } from '../../i18n';

interface SpinnerProps {
  message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-emerald-600/80 animate-fade-in">
      <div className="relative mb-6">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-rose-400 border-l-2 border-transparent"></div>
        <div className="animate-spin rounded-full h-10 w-10 border-r-2 border-b-2 border-emerald-400 border-t-2 border-transparent absolute top-2 left-2" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <p className="font-medium tracking-wide animate-pulse-soft">{message || t('loading')}</p>
    </div>
  );
};

export default Spinner;