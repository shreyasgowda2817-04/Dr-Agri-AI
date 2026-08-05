import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ShieldAlert, CheckCircle, Clock } from 'lucide-react';

const AnalysisCard = ({ result, ui }) => {
  if (!result) return null;

  const data = [
    { name: 'Confidence', value: result.confidence_score },
    { name: 'Remaining', value: 100 - result.confidence_score }
  ];

  const COLORS = ['#10B981', '#E5E7EB'];

  const getSeverityColor = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 opacity-50" />
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 mb-3">
            <CheckCircle size={14} /> {ui.analysisTitle}
          </span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
            {result.disease_name.replace(/___/g, ' ')}
          </h2>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">
            {ui.cropLabel} {result.crop_name}
          </p>
        </div>
        
        <div className="w-24 h-24 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={40}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black text-emerald-600">{result.confidence_score}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{ui.severityLabel}</p>
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border ${getSeverityColor(result.severity)}`}>
            {result.severity}
          </span>
        </div>
        
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{ui.versionLabel}</p>
          <p className="text-sm font-bold text-gray-900">Dr Agri v2.4</p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 col-span-2 flex items-center justify-between">
           <div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{ui.timestampLabel}</p>
             <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
               <Clock size={14} className="text-emerald-500" />
               {new Date().toLocaleString()}
             </p>
           </div>
           <ShieldAlert className="text-emerald-200" size={32} />
        </div>
      </div>
    </motion.div>
  );
};

export default AnalysisCard;
