import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Plus, Edit3, Trash2, X, Image as ImageIcon, 
  CheckCircle, Clock, Eye, AlertCircle 
} from 'lucide-react';
import { toast } from 'react-toastify';

const ARTICLE_TYPES = ['News', 'Scheme', 'Guide', 'Blog'];

const CMS = () => {
  const { user } = useSelector(state => state.auth);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    article_type: 'News',
    is_published: false,
    image_url: '',
    tags: ''
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    setError('');
    try {
      // Admins get ALL articles (including drafts)
      const res = await api.get('/cms/articles/all');
      setArticles(res.data);
    } catch (err) {
      setError('Failed to load articles. Ensure you have Admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingArticle(null);
    setForm({
      title: '',
      content: '',
      article_type: 'News',
      is_published: false,
      image_url: '',
      tags: ''
    });
    setShowModal(true);
  };

  const openEditModal = (article) => {
    setEditingArticle(article);
    setForm({
      title: article.title || '',
      content: article.content || '',
      article_type: article.article_type || 'News',
      is_published: article.is_published || false,
      image_url: article.image_url || '',
      tags: article.tags ? article.tags.join(', ') : ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      };

      if (editingArticle) {
        await api.put(`/cms/articles/${editingArticle.id}`, payload);
        toast.success('Article updated successfully!');
      } else {
        await api.post('/cms/articles', payload);
        toast.success('Article published successfully!');
      }
      setShowModal(false);
      fetchArticles();
    } catch (err) {
      toast.error('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this article?")) return;
    try {
      await api.delete(`/cms/articles/${id}`);
      toast.success('Article deleted');
      fetchArticles();
    } catch (err) {
      toast.error('Failed to delete article');
    }
  };

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-8 text-white mb-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-blue-400" />
            Content Management System
          </h1>
          <p className="text-blue-200">Publish News, Government Schemes & Crop Guides</p>
        </div>
        <button onClick={openAddModal} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-sm">
          <Plus size={18} /> Write Article
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-8 flex items-center gap-3">
          <AlertCircle />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Articles List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" /> Published Content
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Loading articles...</td></tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No articles written yet.</p>
                  </td>
                </tr>
              ) : (
                articles.map(article => (
                  <tr key={article.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {article.image_url ? (
                          <img src={article.image_url} alt={article.title} className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0"><ImageIcon size={20} /></div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 line-clamp-1">{article.title}</p>
                          <div className="flex gap-1 mt-1">
                            {article.tags?.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[10px] uppercase font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold border border-indigo-100">
                        {article.article_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {article.is_published ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-100">
                          <CheckCircle size={14} /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md text-xs font-bold border border-amber-100">
                          <Clock size={14} /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                      {new Date(article.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Preview"><Eye size={18} /></button>
                        <button onClick={() => openEditModal(article)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit"><Edit3 size={18} /></button>
                        <button onClick={() => handleDelete(article.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="text-indigo-600" /> {editingArticle ? 'Edit Article' : 'Write New Article'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={18} /></button>
              </div>

              <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Headline Title *</label>
                  <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., New Solar Pump Subsidy Available"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">Article Type *</label>
                    <select required value={form.article_type} onChange={e => setForm({...form, article_type: e.target.value})} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium">
                      {ARTICLE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">Cover Image URL (Optional)</label>
                    <input type="url" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Content (Markdown supported) *</label>
                  <textarea required rows={10} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Write your article content here..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-900 font-medium leading-relaxed font-mono text-sm" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">Tags (comma separated)</label>
                    <input type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="e.g., subsidy, solar, 2026"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-3 cursor-pointer p-4 border border-gray-200 rounded-xl w-full hover:bg-gray-50 transition">
                      <input type="checkbox" checked={form.is_published} onChange={e => setForm({...form, is_published: e.target.checked})} 
                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <div>
                        <span className="block text-sm font-bold text-gray-900">Publish Immediately</span>
                        <span className="block text-xs text-gray-500 mt-0.5">If unchecked, it will save as a Draft.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-6 mt-2 border-t border-gray-100 flex gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md disabled:opacity-70 flex items-center justify-center gap-2">
                    {saving ? 'Saving...' : editingArticle ? <><Edit3 size={18}/> Update Article</> : <><Plus size={18}/> Save Article</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CMS;
