import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, PlusCircle, AlertCircle, CheckCircle, Clock, Send, ChevronLeft } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

const Support = () => {
  const { t } = useTranslation();
  

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const user = useSelector(state => state.auth.user);

  // New Ticket Form State
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  // Chat State
  const [replyMessage, setReplyMessage] = useState('');

  const fetchTickets = async () => {
    

    try {
      const res = await api.get('/support/');
      setTickets(res.data);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    

    e.preventDefault();
    try {
      const res = await api.post('/support/', {
        subject,
        description,
        priority
      });
      setTickets([res.data, ...tickets]);
      setShowCreate(false);
      setSubject('');
      setDescription('');
      toast.success("Support ticket raised successfully!");
    } catch (err) {
      toast.error("Failed to create ticket.");
    }
  };

  const handleSendReply = async (e) => {
    

    e.preventDefault();
    if (!replyMessage.trim()) return;
    try {
      const res = await api.post(`/support/${activeTicket.id}/messages`, {
        message: replyMessage
      });
      
      // Update local state
      setActiveTicket({
        ...activeTicket,
        messages: [...activeTicket.messages, res.data]
      });
      
      // Also update in list
      setTickets(tickets.map(t => t.id === activeTicket.id ? {
        ...t,
        messages: [...t.messages, res.data]
      } : t));
      
      setReplyMessage('');
    } catch (err) {
      toast.error("Failed to send message.");
    }
  };

  const handleUpdateStatus = async (status) => {
    

    try {
      await api.put(`/support/${activeTicket.id}/status`, { status });
      setActiveTicket({ ...activeTicket, status });
      setTickets(tickets.map(t => t.id === activeTicket.id ? { ...t, status } : t));
      toast.success(`Ticket marked as ${status}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const getStatusColor = (status) => {
    

    switch (status) {
      case 'OPEN': return 'text-amber-600 bg-amber-100';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-100';
      case 'RESOLVED': return 'text-emerald-600 bg-emerald-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 w-full min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="text-indigo-600 shrink-0" />{t("support_helpdesk")}</h1>
        {!activeTicket && !showCreate && (
          <button 
            onClick={() => setShowCreate(true)}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-sm text-sm"
          >
            <PlusCircle size={18} />{t("new_ticket")}</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : showCreate ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto"
        >
          <div className="flex items-center mb-6">
            <button onClick={() => setShowCreate(false)} className="mr-4 text-gray-500 hover:text-gray-900">
              <ChevronLeft />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{t("raise_a_support_tick")}</h2>
          </div>
          
          <form onSubmit={handleCreateTicket} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("issue_subject")}</label>
              <input 
                type="text" 
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., Drone scan failed to upload"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("priority_level")}</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="LOW">{t("low___general_questi")}</option>
                <option value="MEDIUM">{t("medium___minor_issue")}</option>
                <option value="HIGH">{t("high___farm_operatio")}</option>
                <option value="URGENT">{t("urgent___critical_sy")}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("description")}</label>
              <textarea 
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Please describe your issue in detail..."
              ></textarea>
            </div>
            
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition">{t("submit_ticket")}</button>
          </form>
        </motion.div>
      ) : activeTicket ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[70vh]">
          {/* Header */}
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveTicket(null)} className="text-gray-500 hover:text-gray-900 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <ChevronLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{activeTicket.subject}</h2>
                <p className="text-sm text-gray-500">{t("raised_by_")}{activeTicket.user_name}{t("__priority_")}<span className="font-bold">{activeTicket.priority}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(activeTicket.status)}`}>
                {activeTicket.status}
              </span>
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && activeTicket.status !== 'RESOLVED' && (
                <button 
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition"
                >
                  <CheckCircle size={16} />{t("mark_resolved")}</button>
              )}
            </div>
          </div>
          
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
            {/* Initial Description */}
            <div className="flex flex-col items-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 max-w-[80%] shadow-sm">
                <p className="text-sm font-bold text-gray-900 mb-1">{activeTicket.user_name}</p>
                <p className="text-gray-700 whitespace-pre-wrap">{activeTicket.description}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(activeTicket.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            {/* Messages */}
            {activeTicket.messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              const isAdmin = msg.sender_role === 'ADMIN' || msg.sender_role === 'SUPER_ADMIN';
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl p-4 max-w-[80%] shadow-sm ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : isAdmin 
                        ? 'bg-amber-50 border border-amber-100 text-gray-900 rounded-tl-sm'
                        : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
                  }`}>
                    {!isMe && (
                      <p className="text-xs font-bold mb-1 opacity-75">
                        {msg.sender_name} {isAdmin && ' (Support Team)'}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-xs mt-2 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Input Box */}
          {activeTicket.status !== 'RESOLVED' ? (
            <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <input 
                type="text"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply here..."
                className="flex-1 border-gray-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-colors px-4 py-3"
              />
              <button 
                type="submit"
                disabled={!replyMessage.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white p-3 rounded-xl transition flex items-center justify-center w-12"
              >
                <Send size={20} />
              </button>
            </form>
          ) : (
            <div className="p-4 bg-emerald-50 border-t border-emerald-100 text-emerald-700 text-center font-medium">{t("this_ticket_has_been")}</div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{t("no_tickets_found")}</h3>
              <p className="text-gray-500">{t("you_don_t_have_any_a")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                    <th className="p-4 font-semibold">{t("subject")}</th>
                    <th className="p-4 font-semibold">{t("status")}</th>
                    <th className="p-4 font-semibold">{t("priority")}</th>
                    <th className="p-4 font-semibold">{t("last_updated")}</th>
                    <th className="p-4 font-semibold text-right">{t("action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setActiveTicket(ticket)}>
                      <td className="p-4">
                        <p className="font-bold text-gray-900">{ticket.subject}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{ticket.description}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-gray-600">{ticket.priority}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center text-sm text-gray-500 gap-1">
                          <Clock size={14} />
                          {new Date(ticket.updated_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-indigo-600 hover:text-indigo-800 text-sm font-bold">{t("view_thread")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Support;
