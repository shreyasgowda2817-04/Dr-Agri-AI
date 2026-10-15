import { useTranslation } from "react-i18next";
import React, { useMemo } from 'react';
import './WeatherAnimations.css';

const generateDrops = (count, className) => {
  
  return Array.from({ length: count }).map((_, i) => {
    const left = `${Math.random() * 100}%`;
    const animationDelay = `${Math.random() * 2}s`;
    const animationDuration = `${0.5 + Math.random() * 0.5}s`;
    const opacity = 0.3 + Math.random() * 0.5;
    
    return (
      <div 
        key={i} 
        className={className} 
        style={{ left, animationDelay, animationDuration, opacity }} 
      />
    );
  });
};

export const SunnyAnimation = () => (
  <div className="animation-layer">
    <div className="sun-glow" />
  </div>
);

export const CloudyAnimation = ({ isDark }) => (
  <div className="animation-layer">
    <div className={`cloud cloud-1 ${isDark ? 'cloud-dark' : ''}`} />
    <div className={`cloud cloud-2 ${isDark ? 'cloud-dark' : ''}`} />
    <div className={`cloud cloud-3 ${isDark ? 'cloud-dark' : ''}`} />
  </div>
);

export const RainAnimation = ({ intensity = 'moderate' }) => {
  const { t } = useTranslation();
  const dropCount = intensity === 'heavy' ? 80 : intensity === 'light' ? 30 : 50;
  const drops = useMemo(() => generateDrops(dropCount, 'raindrop'), [dropCount]);
  
  return (
    <div className="animation-layer">
      {drops}
      <CloudyAnimation isDark={true} />
    </div>
  );
};

export const ThunderstormAnimation = () => {
  const { t } = useTranslation();
  const drops = useMemo(() => generateDrops(100, 'raindrop'), []);
  
  return (
    <div className="animation-layer thunder-layer">
      {drops}
      <div className="cloud cloud-1 cloud-storm" />
      <div className="cloud cloud-2 cloud-storm" />
      <div className="cloud cloud-3 cloud-storm" style={{ opacity: 0.9 }} />
    </div>
  );
};

export const FogAnimation = () => (
  <div className="animation-layer">
    <div className="mist-layer" />
    <div className="mist-layer" style={{ animationDelay: '-10s', bottom: '10%' }} />
  </div>
);

export const SnowAnimation = () => {
  const { t } = useTranslation();
  const flakes = useMemo(() => generateDrops(60, 'snowflake'), []);
  return (
    <div className="animation-layer">
      {flakes}
      <CloudyAnimation isDark={false} />
    </div>
  );
};

export const WeatherVisuals = ({ code, isDay = 1 }) => {
  const { t } = useTranslation();
  // WMO Code Mapping
  if ([0].includes(code)) return <SunnyAnimation />;
  if ([1, 2].includes(code)) return <><SunnyAnimation /><CloudyAnimation /></>;
  if ([3].includes(code)) return <CloudyAnimation isDark={!isDay} />;
  if ([45, 48].includes(code)) return <FogAnimation />;
  if ([51, 53, 55, 56, 57].includes(code)) return <RainAnimation intensity="light" />;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <RainAnimation intensity="heavy" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <SnowAnimation />;
  if ([95, 96, 99].includes(code)) return <ThunderstormAnimation />;
  
  return <CloudyAnimation />; // Fallback
};

export const getWeatherBackgroundClass = (code, isDay = 1) => {
  
  if (!isDay && ![95, 96, 99].includes(code)) return 'bg-night';
  if ([0, 1, 2].includes(code)) return 'bg-sunny';
  if ([3].includes(code)) return 'bg-cloudy';
  if ([45, 48].includes(code)) return 'bg-foggy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'bg-rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'bg-snowy';
  if ([95, 96, 99].includes(code)) return 'bg-thunder';
  return 'bg-cloudy';
};
