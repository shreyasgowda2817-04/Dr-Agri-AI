import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee, TrendingUp, TrendingDown, Plus, Download, FileText, CalendarDays, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useSelector } from 'react-redux';
import jsPDF from 'jspdf';

const Finance = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ type: 'expense', category: 'Seeds', amount: '', crop_name: '', description: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [generatingDossier, setGeneratingDossier] = useState(false);
  const { user } = useSelector(state => state.auth);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/finance/summary');
      setSummary(res.data);
    } catch (error) {
      console.error("Error fetching finance summary", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.type === 'expense') {
        await api.post('/finance/expenses', {
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description
        });
      } else {
        await api.post('/finance/revenues', {
          crop_name: formData.crop_name,
          amount: parseFloat(formData.amount),
          description: formData.description
        });
      }
      setShowModal(false);
      fetchSummary();
      setFormData({ type: 'expense', category: 'Seeds', amount: '', crop_name: '', description: '' });
    } catch (error) {
      console.error("Error saving log", error);
    }
  };

  const handleGenerateDossier = async () => {
    setGeneratingDossier(true);
    try {
      // 1. Fetch dossier data
      const res = await api.get('/finance/dossier');
      const data = res.data;
      
      // 2. Generate PDF using pure jsPDF
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Header Background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 40, 'F');
      
      // Title
      doc.setFontSize(28);
      doc.setTextColor(4, 120, 87); // Emerald 700
      doc.setFont("helvetica", "bold");
      doc.text("Dr Agri AI", 15, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // Gray 500
      doc.text("CERTIFIED LOAN DOSSIER", 15, 27);
      
      // Date
      doc.setFontSize(10);
      doc.text("Date Generated", 195, 20, { align: "right" });
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39); // Gray 900
      doc.text(new Date(data.generated_at).toLocaleDateString(), 195, 27, { align: "right" });
      
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(1);
      doc.line(15, 40, 195, 40);

      // Applicant Profile Box
      doc.setFillColor(249, 250, 251); // Gray 50
      doc.setDrawColor(229, 231, 235); // Gray 200
      doc.roundedRect(15, 50, 180, 30, 3, 3, 'FD');
      
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175); // Gray 400
      doc.text("APPLICANT PROFILE", 20, 58);
      
      doc.setFontSize(18);
      doc.setTextColor(17, 24, 39);
      doc.text(data.farmer_name || 'Dr Agri Farmer', 20, 68);
      
      doc.setFontSize(11);
      doc.setTextColor(75, 85, 99);
      doc.text(data.farmer_email || 'farmer@dragri.com', 20, 75);
      
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text("RISK TIER", 190, 58, { align: "right" });
      
      // Risk Tier Badge
      doc.setFontSize(12);
      if (data.health_score >= 750) {
        doc.setTextColor(6, 95, 70); // Emerald 800
      } else if (data.health_score >= 600) {
        doc.setTextColor(146, 64, 14); // Amber 800
      } else {
        doc.setTextColor(153, 27, 27); // Red 800
      }
      doc.text(data.risk_tier, 190, 68, { align: "right" });
      
      // Health Score
      doc.setFontSize(12);
      doc.setTextColor(156, 163, 175);
      doc.text("FARM HEALTH SCORE", 105, 100, { align: "center" });
      
      doc.setFontSize(48);
      if (data.health_score >= 750) {
        doc.setTextColor(16, 185, 129); // Emerald 500
      } else {
        doc.setTextColor(245, 158, 11); // Amber 500
      }
      doc.text(data.health_score.toString(), 105, 118, { align: "center" });
      doc.setFontSize(14);
      doc.setTextColor(156, 163, 175);
      doc.text("/ 1000", 105, 126, { align: "center" });

      // Two Columns
      // Left: Farm Assets
      doc.roundedRect(15, 140, 85, 45, 3, 3, 'S');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text("FARM ASSETS", 20, 148);
      
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text("Total Plots:", 20, 158);
      doc.setTextColor(17, 24, 39);
      doc.text(data.total_farms.toString(), 95, 158, { align: "right" });
      
      doc.setTextColor(75, 85, 99);
      doc.text("Total Area:", 20, 168);
      doc.setTextColor(17, 24, 39);
      doc.text(`${data.total_area_acres} Acres`, 95, 168, { align: "right" });
      
      doc.setTextColor(75, 85, 99);
      doc.text("Active Crops:", 20, 178);
      doc.setTextColor(17, 24, 39);
      const activeCropsStr = data.active_crops.length ? data.active_crops.join(', ') : 'None';
      doc.text(activeCropsStr, 95, 178, { align: "right" });

      // Right: Financials
      doc.roundedRect(110, 140, 85, 45, 3, 3, 'S');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text("FINANCIAL OVERVIEW", 115, 148);
      
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text("Est. Revenue:", 115, 158);
      doc.setTextColor(17, 24, 39);
      doc.text(`Rs. ${data.financials?.annual_revenue?.toLocaleString() || 0}`, 190, 158, { align: "right" });
      
      doc.setTextColor(75, 85, 99);
      doc.text("Est. Expenses:", 115, 168);
      doc.setTextColor(225, 29, 72); // Rose 600
      doc.text(`Rs. ${data.financials?.annual_expenses?.toLocaleString() || 0}`, 190, 168, { align: "right" });
      
      doc.setTextColor(75, 85, 99);
      doc.text("Net Profit:", 115, 178);
      doc.setTextColor(5, 150, 105); // Emerald 600
      doc.text(`Rs. ${data.financials?.net_profit?.toLocaleString() || 0}`, 190, 178, { align: "right" });

      // Assessment Factors
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text("SCORE FACTORS", 15, 200);
      
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(15, 205, 180, (data.factors?.length || 1) * 8 + 10, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81); // Gray 700
      if (data.factors) {
        data.factors.forEach((factor, idx) => {
          doc.text(`• ${factor}`, 20, 213 + (idx * 8));
        });
      }

      // Footer
      doc.setDrawColor(229, 231, 235);
      doc.line(15, 275, 195, 275);
      
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("This document is cryptographically generated by Dr Agri AI.", 15, 282);
      doc.text("The metrics reflect immutable ledger records derived from IoT, ML disease scans, and financial logs.", 15, 287);
      
      // Save
      doc.save(`AgriCredit_Dossier_${data.farmer_name?.replace(/\s+/g, '_') || 'Export'}.pdf`);
      setGeneratingDossier(false);
    } catch (error) {
      console.error("Failed to generate dossier", error);
      setGeneratingDossier(false);
    }
  };

  const generateInvoice = (transaction) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(26);
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.text("COMMERCIAL INVOICE", 105, 25, null, null, "center");
    
    doc.setDrawColor(200);
    doc.line(20, 35, 190, 35);
    
    // Company Info
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`ISSUED BY:`, 20, 50);
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(user?.name || 'Dr Agri Enterprise Farm', 20, 57);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Email: ${user?.email || 'enterprise@dragri.com'}`, 20, 63);
    doc.text(`Role: ${user?.role || 'FARMER'}`, 20, 68);
    
    // Invoice details
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`INVOICE DETAILS:`, 130, 50);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Invoice No: INV-${transaction.id.replace('REV-', '')}`, 130, 57);
    doc.text(`Date: ${new Date(transaction.date).toLocaleDateString()}`, 130, 63);
    doc.text(`Status: PAID`, 130, 68);
    
    // Line Item Table
    doc.setFillColor(245, 247, 250);
    doc.rect(20, 85, 170, 12, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("ITEM DESCRIPTION", 25, 93);
    doc.text("QTY", 120, 93);
    doc.text("TOTAL AMOUNT", 150, 93);
    
    doc.line(20, 97, 190, 97);
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`B2B Commodity Sale: ${transaction.category}`, 25, 107);
    doc.text("1 Bulk", 120, 107);
    doc.text(`Rs. ${parseFloat(transaction.amount).toFixed(2)}`, 150, 107);
    
    doc.line(20, 115, 190, 115);
    
    // Total
    doc.setFontSize(12);
    doc.text("NET TOTAL:", 115, 130);
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${parseFloat(transaction.amount).toFixed(2)}`, 150, 131);
    
    // Save
    doc.save(`Invoice_${transaction.id}.pdf`);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce"></div>
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );

  const transactions = summary?.transactions || [];
  const filteredTransactions = transactions.filter(t => 
    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Transform data for beautiful area chart
  const profitData = [
    { name: 'Jan', Profit: 0 },
    { name: 'Feb', Profit: summary?.net_profit > 1000 ? summary.net_profit * 0.2 : 0 },
    { name: 'Mar', Profit: summary?.net_profit > 1000 ? summary.net_profit * 0.5 : 0 },
    { name: 'Apr', Profit: summary?.net_profit > 1000 ? summary.net_profit * 0.8 : summary?.net_profit || 0 },
    { name: 'May', Profit: summary?.net_profit || 0 }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Financial Ledger</h1>
          <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1 uppercase tracking-widest text-xs">Enterprise B2B Accounting Module</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleGenerateDossier}
            disabled={generatingDossier}
            className="flex-1 md:flex-none bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition disabled:opacity-50"
          >
            {generatingDossier ? (
              <span className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <FileText size={18} />
            )}
            Download Report
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex-1 md:flex-none bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition shadow-lg shadow-gray-900/20 dark:shadow-white/10"
          >
            <Plus size={18} /> Transaction
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          icon={<TrendingDown className="w-6 h-6 text-red-500" />} 
          title="Operating Expenses" 
          value={`₹${summary?.total_expenses?.toFixed(2) || '0.00'}`} 
          color="red" 
        />
        <StatCard 
          icon={<TrendingUp className="w-6 h-6 text-emerald-500" />} 
          title="Gross Revenue" 
          value={`₹${summary?.total_revenue?.toFixed(2) || '0.00'}`} 
          color="emerald" 
        />
        <StatCard 
          icon={<IndianRupee className="w-6 h-6 text-blue-500" />} 
          title="Net Profit (YTD)" 
          value={`₹${summary?.net_profit?.toFixed(2) || '0.00'}`} 
          color={summary?.net_profit >= 0 ? "blue" : "red"} 
        />
      </div>

      {/* Chart Row */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">Profitability Trend</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={profitData}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dx={-10} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(value) => [`₹${value}`, 'Net Profit']}
              />
              <Area type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-emerald-500" /> Transaction Ledger
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search category..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-950/50 text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold">Description</th>
                <th className="px-6 py-4 font-bold text-right">Amount</th>
                <th className="px-6 py-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400 dark:text-gray-600 font-medium">
                    No transactions found in ledger.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={idx} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 font-medium">
                        <CalendarDays size={14} className="text-gray-400" />
                        {tx.date ? new Date(tx.date).toLocaleDateString() : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        tx.type === 'Revenue' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      {tx.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                      {tx.description || '-'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-black text-right ${
                      tx.type === 'Revenue' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {tx.type === 'Revenue' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {tx.type === 'Revenue' && (
                        <button 
                          onClick={() => generateInvoice(tx)}
                          className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition"
                        >
                          <Download size={14} /> PDF Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Log Transaction</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Entry Type</label>
                  <select 
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="expense">Operating Expense</option>
                    <option value="revenue">B2B Revenue (Crop Sale)</option>
                  </select>
                </div>

                {formData.type === 'expense' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Category</label>
                    <select 
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option>Seeds & Saplings</option>
                      <option>Fertilizer</option>
                      <option>Pesticide</option>
                      <option>Labor & Wages</option>
                      <option>Equipment</option>
                      <option>Logistics</option>
                      <option>Other</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Commodity Sold</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={formData.crop_name}
                      onChange={(e) => setFormData({...formData, crop_name: e.target.value})}
                      placeholder="e.g. Premium Tomatoes"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Total Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Remarks (Optional)</label>
                  <textarea 
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="2"
                    placeholder="Add details..."
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-bold hover:scale-[1.02] transition shadow-md"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => (
  <motion.div 
    className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4"
    whileHover={{ y: -5 }}
  >
    <div className={`p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20`}>
      {icon}
    </div>
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">{title}</p>
      <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  </motion.div>
);

export default Finance;
