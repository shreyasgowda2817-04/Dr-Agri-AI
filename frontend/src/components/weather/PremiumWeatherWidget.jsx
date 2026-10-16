import { useTranslation } from "react-i18next";
import React from 'react';
import { WeatherVisuals, getWeatherBackgroundClass } from './WeatherAnimations';
import { 
  CloudRain, Droplets, Wind, Thermometer, Sprout, 
  MapPin, AlertTriangle, CloudSun, Sun, CloudFog, 
  CloudDrizzle, Snowflake, CloudLightning, Cloud 
} from 'lucide-react';

export const WeatherIcon = ({ code, size = 24, className = "" }) => {
  const { t } = useTranslation();
  

  if ([0].includes(code)) return <Sun size={size} className={`text-yellow-400 ${className}`} />;
  if ([1,2,3].includes(code)) return <CloudSun size={size} className={`text-blue-100 ${className}`} />;
  if ([45,48].includes(code)) return <CloudFog size={size} className={`text-gray-300 ${className}`} />;
  if ([51,53,55,56,57].includes(code)) return <CloudDrizzle size={size} className={`text-blue-200 ${className}`} />;
  if ([61,63,65,66,67,80,81,82].includes(code)) return <CloudRain size={size} className={`text-blue-300 ${className}`} />;
  if ([71,73,75,77,85,86].includes(code)) return <Snowflake size={size} className={`text-white ${className}`} />;
  if ([95,96,99].includes(code)) return <CloudLightning size={size} className={`text-yellow-200 ${className}`} />;
  return <Cloud size={size} className={`text-gray-300 ${className}`} />;
};

const getConditionString = (code) => {
  

  if ([0].includes(code)) return 'Clear';
  if ([1,2,3].includes(code)) return 'Partly Cloudy';
  if ([45,48].includes(code)) return 'Fog';
  if ([51,53,55,56,57].includes(code)) return 'Light Rain';
  if ([61,63,65,66,67,80,81,82].includes(code)) return 'Rain';
  if ([71,73,75,77,85,86].includes(code)) return 'Snow';
  if ([95,96,99].includes(code)) return 'Thunderstorm';
  return 'Unknown';
};

const PremiumWeatherWidget = ({ weather, locationName }) => {
  const { t } = useTranslation();
  

  if (!weather || !weather.current) return null;

  const current = weather.current;
  const daily = weather.daily || {};
  const code = current.weather_code;
  const isDay = current.is_day;

  // Agricultural Logic
  const rainExpected = daily.precipitation_probability_max?.[0] > 50;
  const highHumidity = current.relative_humidity_2m > 80;

  let irrigationNeed = "Moderate";
  let farmAdvisory = "Conditions are optimal.";
  let riskLevel = "Low";

  if (rainExpected) {
    irrigationNeed = "Low requirement";
    farmAdvisory = "Rain expected — avoid unnecessary irrigation.";
  } else if (current.temperature_2m > 30 && current.relative_humidity_2m < 40) {
    irrigationNeed = "High requirement";
    farmAdvisory = "Heat stress risk. Increase irrigation frequency.";
    riskLevel = "Moderate";
  }

  if (highHumidity) {
    riskLevel = "Elevated";
    if (rainExpected) {
       farmAdvisory = "High humidity & rain. Monitor crops for fungal disease signs.";
    }
  }

  return (
    <div className="w-full max-w-full flex flex-col gap-6 mb-8 font-sans overflow-hidden">

      {/* Top Section: Hero Visual + Forecast Column */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full max-w-full">
        
        {/* HERO SECTION */}
        <div className={`w-full max-w-full flex-1 weather-container shadow-xl min-h-[300px] sm:min-h-[360px] flex flex-col p-4 sm:p-6 md:p-8 ${getWeatherBackgroundClass(code, isDay)} relative isolate rounded-2xl overflow-hidden`}>
          <WeatherVisuals code={code} isDay={isDay} />
          
          <div className="z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-5xl sm:text-7xl md:text-8xl font-light tracking-tighter drop-shadow-md">
                  {Math.round(current.temperature_2m)}°
                </h3>
                <p className="text-xl sm:text-2xl font-medium mt-1 sm:mt-2 drop-shadow-sm truncate">
                  {getConditionString(code)}
                </p>
                <div className="flex items-center gap-1.5 mt-1 sm:mt-2 opacity-80 text-xs sm:text-sm truncate">
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">{locationName}</span>
                </div>
              </div>
              <div className="shrink-0">
                <WeatherIcon code={code} size={56} className="opacity-90 drop-shadow-xl sm:hidden" />
                <WeatherIcon code={code} size={84} className="opacity-90 drop-shadow-xl hidden sm:block" />
              </div>
            </div>
            
            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-auto bg-black/25 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 w-full">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-xs text-white/75 font-medium uppercase tracking-wider mb-0.5 truncate">{t("humidity")}</span>
                <span className="font-semibold text-base sm:text-lg">{current.relative_humidity_2m}%</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-xs text-white/75 font-medium uppercase tracking-wider mb-0.5 truncate">{t("wind")}</span>
                <span className="font-semibold text-base sm:text-lg">{current.wind_speed_10m} {t("km_h")}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-xs text-white/75 font-medium uppercase tracking-wider mb-0.5 truncate">{t("feels_like")}</span>
                <span className="font-semibold text-base sm:text-lg">{Math.round(current.apparent_temperature)}°</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-xs text-white/75 font-medium uppercase tracking-wider mb-0.5 truncate">{t("rain_chance")}</span>
                <span className="font-semibold text-base sm:text-lg">{daily.precipitation_probability_max?.[0] || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7-DAY FORECAST LIST */}
        <div className="w-full lg:w-80 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6 shadow-sm flex flex-col max-w-full">
          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 uppercase tracking-wider">{t("7_day_forecast")}</h4>
          <div className="flex-1 flex flex-col justify-between space-y-2">
            {daily.time?.slice(0, 7).map((date, idx) => {
              const dCode = daily.weather_code[idx];
              const max = Math.round(daily.temperature_2m_max[idx]);
              const min = Math.round(daily.temperature_2m_min[idx]);
              const dayName = idx === 0 ? 'Today' : new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
              
              return (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0 gap-2">
                  <span className={`w-12 sm:w-14 text-sm font-medium shrink-0 ${idx === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                    {dayName}
                  </span>
                  <WeatherIcon code={dCode} size={20} className="text-gray-700 dark:text-gray-300 shrink-0" />
                  <div className="flex items-center gap-2 sm:gap-3 justify-end flex-1 max-w-[130px] sm:max-w-none sm:w-32 min-w-0">
                    <span className="text-xs sm:text-sm text-gray-500 font-medium w-5 sm:w-6 text-right shrink-0">{min}°</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative min-w-[36px] sm:min-w-[50px]">
                      <div className="absolute top-0 bottom-0 left-[20%] right-[20%] bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full"></div>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white w-5 sm:w-6 text-right shrink-0">{max}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AGRICULTURAL ADVISORY */}
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden w-full max-w-full">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Sprout size={120} />
        </div>
        
        <h4 className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold mb-4 text-sm sm:text-base">
          <Sprout size={20} className="shrink-0" />{t("farm_weather_advisor")}</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-10">
          <div>
            <div className="text-xs font-bold text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-wider mb-1">{t("irrigation")}</div>
            <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{irrigationNeed}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-wider mb-1">{t("crop_risk")}</div>
            <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
              {riskLevel !== 'Low' && <AlertTriangle size={14} className="text-amber-500 shrink-0" />} {riskLevel}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-wider mb-1">{t("advisory")}</div>
            <div className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base">{farmAdvisory}</div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PremiumWeatherWidget;
