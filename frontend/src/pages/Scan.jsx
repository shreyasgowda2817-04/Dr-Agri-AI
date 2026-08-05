import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Loader2, Camera, Image as ImageIcon, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import { translateResultObject, translateUIStrings } from '../utils/translator';
import { defaultUIStrings } from '../utils/uiStrings';

// Import new modular components
import AnalysisCard from '../components/scan/AnalysisCard';
import DiseaseOverview from '../components/scan/DiseaseOverview';
import TreatmentTable from '../components/scan/TreatmentTable';
import PreventionAndSafety from '../components/scan/PreventionAndSafety';
import AIInsights from '../components/scan/AIInsights';
import ActionPanel from '../components/scan/ActionPanel';
import HistorySidebar from '../components/scan/HistorySidebar';

const Scan = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [originalResult, setOriginalResult] = useState(null); // Keep English source for clean translations
  const [uiStrings, setUiStrings] = useState(defaultUIStrings);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const executeScan = async (latitude = null, longitude = null) => {
      if (latitude) formData.append('latitude', latitude);
      if (longitude) formData.append('longitude', longitude);
      
      try {
        const res = await api.post('/ml/predict', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResult(res.data);
        setOriginalResult(res.data);
        toast.success('Analysis complete!');
      } catch (err) {
        if (err.response?.data?.detail) {
          toast.error(typeof err.response.data.detail === 'string' ? err.response.data.detail : err.response.data.detail.message || 'Scan failed.');
        } else {
          toast.error('Network Error: Make sure your backend server is running!');
        }
        console.error("Scan Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => executeScan(position.coords.latitude, position.coords.longitude),
        (error) => executeScan(null, null)
      );
    } else {
      executeScan(null, null);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    
    // Helper for wrapping text
    const addWrappedText = (text, x, y, maxWidth, lineHeight) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * lineHeight);
    };

    // Header
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Dr Agri AI - Enterprise Report", 15, 20);
    
    // Basic Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${uiStrings.cropLabel} ${result.crop_name}`, 15, 45);
    doc.text(`${uiStrings.analysisTitle}: ${result.disease_name.replace(/___/g, ' ')}`, 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Confidence: ${result.confidence_score}%`, 15, 65);
    doc.text(`${uiStrings.severityLabel}: ${result.severity || 'High'}`, 15, 75);
    doc.text(`${uiStrings.timestampLabel}: ${new Date().toLocaleString()}`, 15, 85);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 90, 195, 90);

    let y = 105;
    
    // Disease Overview
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(uiStrings.overviewTitle, 15, y);
    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const overview = `${result.disease_name.replace(/___/g, ' ')} ${uiStrings.overviewDescPart1} ${result.crop_name}. ${uiStrings.overviewDescPart2}`;
    y = addWrappedText(overview, 15, y, 180, 7);
    
    y += 10;
    
    // Treatment Options
    if (result.recommended_treatment) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(uiStrings.chemicalTitle, 15, y);
      y += 10;
      doc.setFontSize(12);
      
      if (result.recommended_treatment.organic_remedies?.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${uiStrings.organicRemediesTitle}:`, 15, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        result.recommended_treatment.organic_remedies.forEach(remedy => {
          if (y > 270) { doc.addPage(); y = 20; }
          y = addWrappedText(`• ${remedy}`, 15, y, 180, 7);
        });
        y += 5;
      }
      
      if (result.recommended_treatment.pesticides?.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text("Pesticides:", 15, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        result.recommended_treatment.pesticides.forEach(pest => {
          if (y > 270) { doc.addPage(); y = 20; }
          y = addWrappedText(`• ${pest} (${uiStrings.sprayMethod}, ${uiStrings.dosage})`, 15, y, 180, 7);
        });
        y += 5;
      }
    }

    if (y > 220) { doc.addPage(); y = 20; }
    
    // Prevention & Safety
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(uiStrings.safetyTitle, 15, y);
    y += 10;
    doc.setFontSize(12);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${uiStrings.preventionTitle}:`, 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    
    uiStrings.tips.forEach(tip => {
      if (y > 270) { doc.addPage(); y = 20; }
      y = addWrappedText(`• ${tip}`, 15, y, 180, 7);
    });

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text("Safety Precautions:", 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    y = addWrappedText(`• ${uiStrings.ppeTitle}: ${uiStrings.ppeDesc}`, 15, y, 180, 7);
    y = addWrappedText(`• ${uiStrings.rainTitle}: ${uiStrings.rainDesc}`, 15, y, 180, 7);
    y = addWrappedText(`• ${uiStrings.childTitle}: ${uiStrings.childDesc}`, 15, y, 180, 7);

    doc.save(`Dr Agri_Report_${new Date().getTime()}.pdf`);
    toast.success('Comprehensive PDF Report Downloaded!');
  };

  const handleShare = async () => {
    if (!result || !result._id) {
      toast.error('Cannot share an unsaved report.');
      return;
    }
    const publicUrl = `${window.location.origin}/report/${result._id}`;
    const text = `Dr Agri AI Scan Result:\nCrop: ${result.crop_name}\nDisease: ${result.disease_name.replace(/___/g, ' ')}\nSeverity: ${result.severity || 'High'}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Crop Disease Scan',
          text: text,
          url: publicUrl,
        });
      } catch (err) {
        console.log('User cancelled share');
      }
    } else {
      navigator.clipboard.writeText(publicUrl);
      toast.success('Public URL copied to clipboard!');
    }
  };

  const handleListen = (onEnd) => {
    if (!result || !window.speechSynthesis) {
      toast.error('Text-to-speech not supported in this browser.');
      onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const text = `${uiStrings.cropLabel} ${result.crop_name}. ${uiStrings.analysisTitle}: ${result.disease_name.replace(/___/g, ' ')}. ${uiStrings.severityLabel}: ${result.severity || 'High'}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    // Adjust language hint for synthesis if possible (basic implementation)
    // Real implementation would pass a lang code.
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    window.speechSynthesis.speak(utterance);
  };

  const handleTranslate = async (langCode) => {
    if (!originalResult) return;
    
    const translationPromise = Promise.all([
      translateResultObject(originalResult, langCode),
      translateUIStrings(defaultUIStrings, langCode)
    ]).then(([translatedResult, translatedUI]) => {
      setResult(translatedResult);
      setUiStrings(translatedUI);
    });

    toast.promise(translationPromise, {
      pending: `Translating dashboard to ${langCode.toUpperCase()}...`,
      success: 'Translation complete! ✨',
      error: 'Failed to translate dashboard.'
    });
  };

  const handleSaveHistory = () => {
    setIsHistoryOpen(true);
  };

  const handleAskAI = () => {
    // Navigate to the Agronomy assistant, passing the context so the AI knows what we are talking about
    navigate('/agronomy', { state: { scanContext: result } });
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative">
      <HistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        onSelectHistory={(historyItem) => {
          setResult(historyItem);
          setOriginalResult(historyItem);
          setFile(null); // Clear active file since we are viewing history
          setPreview(null);
        }}
      />
      
      <div className="max-w-[1400px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Crop Disease <span className="text-indigo-600">Intelligence</span>
            </h1>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl font-medium">
              Upload an image of a diseased plant leaf. Our enterprise AI will analyze the pathogen, assess severity, and instantly generate a comprehensive treatment protocol.
            </p>
          </div>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm hover:border-indigo-300 hover:text-indigo-600 px-4 py-2.5 rounded-xl font-bold text-gray-700 transition-colors shrink-0"
          >
            <Menu size={20} />
            Scan History
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Upload & Preview */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Camera size={16} /> Input Media
              </h3>
              
              <label 
                className={`relative flex flex-col items-center justify-center w-full h-80 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group
                  ${preview ? 'border-transparent bg-black' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-indigo-300'}`}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="Crop" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <ImageIcon size={14} /> Change Image
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                      <UploadCloud size={32} />
                    </div>
                    <p className="mb-2 text-sm font-bold text-gray-700">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">SVG, PNG, JPG or GIF (MAX. 10MB)</p>
                  </div>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>

              <button
                onClick={handleScan}
                disabled={!file || loading}
                className={`w-full mt-6 py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2
                  ${!file || loading ? 'bg-gray-300 shadow-none cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-0.5'}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing AI Models...
                  </>
                ) : (
                  'Initialize AI Analysis'
                )}
              </button>
            </div>
            
            {/* Wait State Info */}
            {!result && !loading && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
                <p className="text-indigo-800 text-sm font-medium leading-relaxed">
                  <strong>System Status: Ready.</strong> Our computer vision models achieve 98.4% accuracy across 32 major crop diseases. Upload a clear, well-lit image of the affected leaf for optimal results.
                </p>
              </motion.div>
            )}
          </div>

          {/* RIGHT COLUMN: AI Dashboard Results */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center min-h-[400px]"
                >
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Biomarkers</h3>
                  <p className="text-gray-500">Cross-referencing global pathology database...</p>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <AnalysisCard result={result} ui={uiStrings} />
                  <DiseaseOverview result={result} ui={uiStrings} />
                  <AIInsights result={result} ui={uiStrings} />
                  <TreatmentTable result={result} ui={uiStrings} />
                  <PreventionAndSafety ui={uiStrings} />
                  <ActionPanel 
                    onDownloadPDF={handleDownloadPDF} 
                    onShare={handleShare}
                    onListen={handleListen}
                    onTranslate={handleTranslate}
                    onSaveHistory={handleSaveHistory}
                    onAskAI={handleAskAI}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scan;
