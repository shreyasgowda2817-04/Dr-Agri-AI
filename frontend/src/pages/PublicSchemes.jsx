import { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, ChevronRight, Calendar, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const PublicSchemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const res = await api.get('/cms/articles');
        // Filter out only schemes
        const schemeData = res.data.filter(a => a.article_type === 'Scheme');
        setSchemes(schemeData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchemes();
  }, []);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
      
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
          Government <span className="text-emerald-600">Schemes</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Explore the latest agricultural subsidies, insurance programs, and financial support initiatives designed to empower your farming journey.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : schemes.length === 0 ? (
        <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-3xl p-16 border border-gray-200 dark:border-gray-700">
          <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Active Schemes Found</h3>
          <p className="text-gray-500 dark:text-gray-400">Please check back later for updates on new government initiatives.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {schemes.map(scheme => (
            <div key={scheme.id} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition flex flex-col md:flex-row group">
              
              {/* Image Section */}
              <div className="w-full md:w-1/3 h-48 md:h-auto bg-gray-100 overflow-hidden relative">
                {scheme.image_url ? (
                  <img src={scheme.image_url} alt={scheme.title} className="w-full h-full object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FileText size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent md:hidden"></div>
                <div className="absolute top-4 left-4 flex gap-2">
                  {scheme.tags?.map(tag => (
                    <span key={tag} className="bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wide">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Content Section */}
              <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium mb-3">
                    <Calendar size={14} />
                    <span>Published {new Date(scheme.created_at).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                    {scheme.title}
                  </h2>
                  
                  <div className="prose prose-sm dark:prose-invert text-gray-600 dark:text-gray-300 line-clamp-3">
                    <ReactMarkdown>{scheme.content}</ReactMarkdown>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <button 
                    onClick={() => toggleExpand(scheme.id)}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:text-emerald-700 flex items-center gap-2 transition"
                  >
                    Read Full Details <ArrowRight size={16} />
                  </button>
                  <button className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition">
                    Check Eligibility
                  </button>
                </div>

                {/* Expanded Content View (Optional) */}
                {expanded[scheme.id] && (
                  <div className="mt-6 pt-6 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <div className="prose prose-emerald dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                      <ReactMarkdown>{scheme.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default PublicSchemes;
