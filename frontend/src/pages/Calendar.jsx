import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { CalendarDays, CloudRain, Droplets, Leaf, Activity, CheckCircle, Zap } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

const Calendar = () => {
  const { t } = useTranslation();
  

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    

    try {
      const res = await api.get('/calendar/tasks');
      setTasks(res.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    

    setPredicting(true);
    try {
      const res = await api.post('/calendar/predict');
      if (res.data.tasks_shifted > 0) {
        toast.success(`AI adjusted ${res.data.tasks_shifted} tasks based on weather forecast!`);
      } else {
        toast.info(res.data.message);
      }
      fetchTasks();
    } catch (error) {
      toast.error('AI Prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  const handleComplete = async (taskId) => {
    

    try {
      await api.put(`/calendar/tasks/${taskId}/complete`);
      toast.success('Task marked as complete!');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  const getTaskIcon = (type) => {
    

    switch(type) {
      case 'Water': return <Droplets className="text-blue-500" />;
      case 'Fertilize': return <Leaf className="text-green-500" />;
      case 'Harvest': return <Activity className="text-amber-500" />;
      default: return <CheckCircle className="text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[70vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6 w-full min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2 sm:gap-3">
            <CalendarDays className="w-7 h-7 sm:w-8 h-8 text-indigo-600 shrink-0" />{t("ai_crop_calendar")}</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">{t("predictive_timeline_")}</p>
        </div>
        <button 
          onClick={handlePredict}
          disabled={predicting}
          className="w-full sm:w-auto justify-center bg-indigo-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-70 text-sm sm:text-base"
        >
          <Zap size={18} className={predicting ? "animate-pulse" : ""} />
          {predicting ? "Running AI..." : "Run AI Prediction"}
        </button>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">{t("upcoming_tasks")}</h2>
        </div>
        
        {tasks.length === 0 ? (
          <div className="text-center py-16 sm:py-20 px-4">
            <CalendarDays className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-600 mb-2">{t("no_tasks_scheduled")}</h3>
            <p className="text-sm text-gray-400 mb-6">{t("click__run_ai_predic")}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map(task => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={task.id} 
                className={`p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition ${task.is_completed ? 'opacity-50 grayscale' : ''}`}
              >
                <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                  <div className="flex flex-col items-center justify-center min-w-[50px] sm:min-w-[80px]">
                    <span className="text-xs sm:text-sm font-bold text-gray-500 uppercase">{new Date(task.scheduled_date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-2xl sm:text-3xl font-black text-gray-900">{new Date(task.scheduled_date).getDate()}</span>
                  </div>
                  
                  <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shrink-0 ${task.task_type === 'Water' ? 'bg-blue-50' : task.task_type === 'Fertilize' ? 'bg-green-50' : 'bg-amber-50'}`}>
                    {getTaskIcon(task.task_type)}
                  </div>
                  
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-bold text-gray-900 flex flex-wrap items-center gap-2">
                      <span className="truncate">{task.title}</span>
                      {task.ai_adjusted && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <CloudRain size={12} />{t("ai_shifted")}</span>
                      )}
                    </h3>
                    {task.ai_adjusted ? (
                      <p className="text-indigo-600 font-medium text-xs sm:text-sm mt-1 flex items-center gap-1">
                        ↳ {task.reason}
                      </p>
                    ) : (
                      <p className="text-gray-500 font-medium text-xs sm:text-sm mt-1">{t("scheduled_automatica")}</p>
                    )}
                  </div>
                </div>

                <div className="self-end sm:self-center shrink-0">
                  {!task.is_completed && (
                    <button 
                      onClick={() => handleComplete(task.id)}
                      className="border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 text-gray-400 hover:text-green-600 p-2 sm:p-3 rounded-full transition flex items-center gap-2 font-bold"
                    >
                      <CheckCircle size={20} />
                    </button>
                  )}
                  {task.is_completed && (
                    <div className="text-green-500 flex items-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-sm">
                      <CheckCircle className="fill-current" size={18} />{t("done")}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
