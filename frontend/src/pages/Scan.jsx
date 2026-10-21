import { useTranslation } from "react-i18next";
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  Loader2, 
  Camera, 
  Image as ImageIcon, 
  Menu, 
  RefreshCw, 
  X,
  MapPin,
  Sparkles,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import { defaultUIStrings } from '../utils/uiStrings';

// Import modular crop scan components
import AnalysisCard from '../components/scan/AnalysisCard';
import VisualAnalysis from '../components/scan/VisualAnalysis';
import DiseaseOverview from '../components/scan/DiseaseOverview';
import AIInsights from '../components/scan/AIInsights';
import TreatmentTable from '../components/scan/TreatmentTable';
import RecoveryPlan from '../components/scan/RecoveryPlan';
import RecoveryTracker from '../components/scan/RecoveryTracker';
import PreventionAndSafety from '../components/scan/PreventionAndSafety';
import RecommendedProducts from '../components/scan/RecommendedProducts';
import ActionPanel from '../components/scan/ActionPanel';
import HistorySidebar from '../components/scan/HistorySidebar';

const Scan = () => {
  const { t, i18n } = useTranslation();
  
  const { user } = useSelector((state) => state.auth);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [originalResult, setOriginalResult] = useState(null);
  const [uiStrings, setUiStrings] = useState(defaultUIStrings);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Farm plot state
  const [farms, setFarms] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState('');

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);
  const navigate = useNavigate();

  // Fetch available farms/plots
  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const res = await api.get('/farms');
        if (Array.isArray(res.data)) {
          setFarms(res.data);
        }
      } catch (err) {
        // Silent catch: guest or no farms created yet
      }
    };
    fetchFarms();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      stopCamera();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setResult(null);
      stopCamera();
    } else if (droppedFile) {
      toast.error('Please drop a valid image file (PNG, JPG, SVG, WebP).');
    }
  };

  const startCamera = async (mode = facingMode) => {
    try {
      setCameraLoading(true);
      stopCamera();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (nativeCameraInputRef.current) {
          nativeCameraInputRef.current.click();
        }
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err) {
      console.warn("Live camera stream unavailable, opening native mobile camera fallback", err);
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.click();
      } else {
        toast.error("Camera access denied or unavailable.");
      }
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const flipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], `crop-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(capturedFile);
        setPreview(URL.createObjectURL(blob));
        setResult(null);
        stopCamera();
        toast.success("Photo captured successfully!");
      }
    }, 'image/jpeg', 0.95);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (selectedPlotId) {
      formData.append('plot_id', selectedPlotId);
    }

    const executeScan = async (latitude = null, longitude = null) => {
      if (latitude) formData.append('latitude', latitude);
      if (longitude) formData.append('longitude', longitude);
      formData.append('language', i18n.language || user?.preferred_language || 'en');

      try {
        const res = await api.post('/ml/predict', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResult(res.data);
        setOriginalResult(res.data);
        toast.success('Advanced agronomic analysis complete!');
      } catch (err) {
        if (err.response?.data?.detail) {
          toast.error(typeof err.response.data.detail === 'string' ? err.response.data.detail : err.response.data.detail.message || 'Scan failed.');
        } else if (err.message && err.message !== 'Network Error') {
          toast.error(err.message);
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

    const addWrappedText = (text, x, y, maxWidth, lineHeight) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * lineHeight);
    };

    // Header Banner
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("Dr Agri AI — Plant Pathology Diagnostic Dossier", 15, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Intelligence Standard v2.5 | Generated: ${new Date().toLocaleString()}`, 15, 26);

    let y = 44;

    // Report Metadata Table Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, 180, 42, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, 180, 42, 3, 3, 'D');

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("SCAN IDENTIFIER:", 20, y + 8);
    doc.text("FARM / PLOT:", 20, y + 17);
    doc.text("DIAGNOSTIC STATUS:", 20, y + 26);
    doc.text("AI ENGINE:", 20, y + 35);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(result.scan_id || result.id || 'SCAN-LOCAL', 70, y + 8);
    doc.text(result.farm_plot_name || 'General Scan (No Plot Link)', 70, y + 17);
    doc.text(result.diagnostic_status || 'Preliminary AI Assessment', 70, y + 26);
    doc.text(`${result.model_info?.model_name || 'Gemini 2.5 Flash'} (Schema v2.5)`, 70, y + 35);

    y += 50;

    // Primary Diagnosis Header
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("Primary Suspected Diagnosis", 15, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    const diseaseTitle = result.disease_name ? result.disease_name.replace(/___/g, ' ') : 'Healthy Foliage';
    doc.text(`${result.crop_name || 'Crop'} — ${diseaseTitle}`, 15, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const category = (result.disease_category || 'Fungal').toUpperCase();
    const affected = result.affected_area_percentage || 16;
    const confidence = result.confidence_score || 85;
    const severity = result.severity || 'Medium';
    doc.text(`Category: ${category} | Pattern Similarity: ${confidence}% | Severity: ${severity} | Affected Leaf Area: ${affected}%`, 15, y);
    y += 10;

    // Symptoms & Biology
    doc.setFont('helvetica', 'bold');
    doc.text("Pathology & Biology Profile:", 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const causal = result.causal_organism || result.disease_details?.causal_agent || 'Pathogen under investigation';
    const vectors = result.spread_vectors || 'Wind-blown spores, rain splash, mechanical contact';
    y = addWrappedText(`• Causal Organism: ${causal}`, 15, y, 180, 5);
    y = addWrappedText(`• Spread Vectors: ${vectors}`, 15, y, 180, 5);
    y += 4;

    // Differential Diagnoses
    if (result.differential_diagnoses && result.differential_diagnoses.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text("Differential Diagnoses (Alternative Possibilities):", 15, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      result.differential_diagnoses.forEach((diff) => {
        const diffLine = `• ${diff.condition_name} (${diff.category || 'Abiotic'}) — Match: ${diff.confidence_score}% | Marker: ${diff.distinguishing_markers || 'None specified'}`;
        y = addWrappedText(diffLine, 15, y, 180, 5);
      });
      y += 4;
    }

    // Weather & Spray Intelligence
    const weather = result.weather_intelligence || result.spray_window_analysis;
    if (weather) {
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text("Microclimate & Verified Spray Window:", 15, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      const temp = weather.temperature_c ?? '26';
      const wind = weather.wind_speed_kmh ?? '8.5';
      const rain = weather.rain_probability_pct ?? '10';
      const windowStatus = weather.optimal_spray_window ? 'Optimal Window Open' : 'Suboptimal / Delay Recommended';
      const reason = weather.meteorological_reason || 'Adequate wind speeds below 14 km/h with low wash-off risk.';
      y = addWrappedText(`• Conditions: ${temp}°C, Wind ${wind} km/h, Rain Risk ${rain}%`, 15, y, 180, 5);
      y = addWrappedText(`• Advisory: ${windowStatus} — ${reason}`, 15, y, 180, 5);
      y += 4;
    }

    // 4-Stage Recovery Roadmap
    if (y > 210) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text("4-Stage Agronomic Recovery Roadmap", 15, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const plan = result.recovery_plan || {};
    const stages = [
      { name: "Immediate (0-48h)", items: plan.immediate_actions || ["Prune diseased canopy", "Disinfect tools"] },
      { name: "Next 3 Days", items: plan.next_3_days || ["Apply protective foliar spray", "Inspect perimeter canopy"] },
      { name: "Next 7 Days", items: plan.next_7_days || ["Apply water-soluble foliar nutrition", "Improve row spacing"] },
      { name: "Follow-up (Day 10-14)", items: plan.follow_up_monitoring || ["Perform follow-up camera scan", "Confirm shoot vigor"] }
    ];

    stages.forEach((st) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(`[${st.name}]`, 15, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      st.items.forEach((item) => {
        y = addWrappedText(`- ${item}`, 18, y, 175, 4.5);
      });
      y += 2;
    });

    // Treatments
    if (result.recommended_treatment) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text("Integrated Pest & Disease Management (IPM)", 15, y);
      y += 7;
      doc.setFontSize(9);

      if (result.recommended_treatment.pesticides?.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text("Chemical Controls (With Safety Guidelines):", 15, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        result.recommended_treatment.pesticides.forEach((pest) => {
          if (y > 265) { doc.addPage(); y = 20; }
          const name = typeof pest === 'object' ? pest.name : pest;
          const active = typeof pest === 'object' && pest.active_ingredient ? ` [AI: ${pest.active_ingredient}]` : '';
          const dose = typeof pest === 'object' && pest.dosage ? ` | Dosage: ${pest.dosage}` : '';
          const phi = typeof pest === 'object' && pest.waiting_period_days ? ` | PHI: ${pest.waiting_period_days}d` : '';
          y = addWrappedText(`• ${name}${active}${dose}${phi}`, 18, y, 175, 4.5);
        });
        y += 3;
      }

      if (result.recommended_treatment.organic_remedies?.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text("Bio-Control & Organic Remedies:", 15, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        result.recommended_treatment.organic_remedies.forEach((rem) => {
          if (y > 265) { doc.addPage(); y = 20; }
          y = addWrappedText(`• ${rem}`, 18, y, 175, 4.5);
        });
      }
    }

    // Disclaimer Footer
    if (y > 240) { doc.addPage(); y = 20; }
    y += 10;
    doc.setDrawColor(203, 213, 225);
    doc.line(15, y, 195, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const disclaimer = "Agronomy Disclaimer: This dossier provides an AI-assisted diagnostic evaluation based on foliar biomarker pattern recognition. Model scores reflect visual feature similarity and are uncalibrated probabilities. Always verify with a certified agronomist and adhere strictly to local agricultural authority regulations prior to chemical application.";
    addWrappedText(disclaimer, 15, y, 180, 4);

    doc.save(`DrAgri_Diagnostic_${result.scan_id || 'Report'}.pdf`);
    toast.success('Advanced Diagnostic PDF Dossier Downloaded!');
  };

  const handleShare = async () => {
    if (!result || (!result._id && !result.id)) {
      toast.error('Cannot share an unsaved report.');
      return;
    }
    const reportId = result.id || result._id;
    const publicUrl = `${window.location.origin}/report/${reportId}`;
    const text = `Dr Agri AI Scan Result:\nCrop: ${result.crop_name}\nDisease: ${result.disease_name?.replace(/___/g, ' ')}\nStatus: ${result.diagnostic_status || 'Preliminary AI Assessment'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dr Agri AI Crop Disease Diagnostic Report',
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
    const text = `${uiStrings.cropLabel} ${result.crop_name}. ${uiStrings.analysisTitle}: ${result.disease_name?.replace(/___/g, ' ')}. ${uiStrings.severityLabel}: ${result.severity || 'Medium'}. Status: ${result.diagnostic_status || 'Preliminary AI Assessment'}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveHistory = () => {
    setIsHistoryOpen(true);
  };

  const handleAskAI = () => {
    navigate('/agronomy', { state: { scanContext: result } });
  };

  return (
    <div className="w-full max-w-full pb-8 sm:pb-12 relative overflow-hidden">
      <HistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        onSelectHistory={(historyItem) => {
          setResult(historyItem);
          setOriginalResult(historyItem);
          setFile(null);
          setPreview(null);
        }}
      />

      <div className="max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <Sparkles size={14} />
              <span>Intelligence Standard v2.5</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
              {t("crop_disease")} <span className="text-indigo-600 dark:text-indigo-400">{t("intelligence")}</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl font-medium">
              {t("upload_an_image_of_a")}
            </p>
          </div>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm hover:border-indigo-300 hover:text-indigo-600 px-4 py-2.5 rounded-xl font-bold text-gray-700 transition-colors shrink-0"
          >
            <Menu size={20} />
            {t("scan_history")}
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Upload, Camera, & Plot Linking */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Camera size={16} />
                  {t("input_media")}
                </h3>
                {/* Live Camera Toggle Button */}
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    disabled={cameraLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
                  >
                    <Camera size={14} />
                    <span>Live Camera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
                  >
                    <X size={14} />
                    <span>Close</span>
                  </button>
                )}
              </div>

              {/* Farm / Plot Association Dropdown */}
              {farms.length > 0 && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-indigo-500" />
                      Farm / Plot Link
                    </span>
                    <span className="text-gray-400 font-normal lowercase">(optional)</span>
                  </label>
                  <select
                    value={selectedPlotId}
                    onChange={(e) => setSelectedPlotId(e.target.value)}
                    className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  >
                    <option value="">General Scan (No Plot Link)</option>
                    {farms.map((farm) => (
                      <option key={farm.id || farm._id} value={farm.id || farm._id}>
                        {farm.name} {farm.area_acres ? `(${farm.area_acres} acres)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <input
                ref={nativeCameraInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />

              {/* Live Camera Viewfinder OR Dropzone */}
              {isCameraActive ? (
                <div className="relative flex flex-col items-center justify-center w-full h-80 rounded-2xl bg-black overflow-hidden shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Top Overlay: Flip camera */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={flipCamera}
                      className="p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition active:scale-95"
                      title="Flip Camera"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  {/* Bottom Overlay: Capture button */}
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-full shadow-lg flex items-center gap-2 transition hover:scale-105 active:scale-95"
                    >
                      <Camera size={18} />
                      <span>Capture Photo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center w-full h-80 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group
                    ${isDragging ? 'border-indigo-500 bg-indigo-50/70 scale-[0.99]' : ''}
                    ${preview ? 'border-transparent bg-black' : !isDragging ? 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-indigo-300' : ''}`}
                >
                  {preview ? (
                    <>
                      <img src={preview} alt="Crop" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <ImageIcon size={14} />
                          {t("change_image")}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                        <UploadCloud size={32} />
                      </div>
                      <p className="mb-2 text-sm font-bold text-gray-700">{t("click_to_upload_or_d")}</p>
                      <p className="text-xs text-gray-500">{t("svg__png__jpg_or_gif")}</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleScan}
                disabled={!file || loading}
                className={`w-full mt-6 py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2
                  ${!file || loading ? 'bg-gray-300 shadow-none cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-0.5'}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {t("processing_ai_models")}
                  </>
                ) : (
                  'Run Advanced AI Diagnosis'
                )}
              </button>
            </div>
            
            {/* Wait State Info */}
            {!result && !loading && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
                <p className="text-indigo-800 text-sm font-medium leading-relaxed">
                  <strong>{t("system_status__ready")} </strong>
                  {t("our_computer_vision_")}
                </p>
              </motion.div>
            )}
          </div>

          {/* RIGHT COLUMN: AI Diagnostic Intelligence Dashboard */}
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t("analyzing_biomarkers")}</h3>
                  <p className="text-gray-500">{t("cross_referencing_gl")}</p>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* 1. Header & Diagnostic Summary */}
                  <AnalysisCard result={result} ui={uiStrings} />

                  {/* 2. Visual Folio Inspection & Annotation */}
                  <VisualAnalysis 
                    result={result} 
                    onRetake={() => {
                      setResult(null);
                      setFile(null);
                      setPreview(null);
                    }} 
                  />

                  {/* 3. Deep Disease Overview & Spread Vectors */}
                  <DiseaseOverview result={result} ui={uiStrings} />

                  {/* 4. Microclimate Intelligence & Spray Window Analysis */}
                  <AIInsights result={result} ui={uiStrings} />

                  {/* 5. Safe Treatment Engine (Chemical, Organic, Canopy Nutrition, Cultural) */}
                  <TreatmentTable result={result} ui={uiStrings} />

                  {/* 6. 4-Stage Recovery Roadmap (Immediate, 3d, 7d, Follow-up) */}
                  <RecoveryPlan result={result} ui={uiStrings} />

                  {/* 7. Recovery Tracking & Action History Timeline */}
                  <RecoveryTracker 
                    result={result} 
                    onUpdateReport={(updated) => setResult(updated)} 
                  />

                  {/* 8. Prevention & Field Safety Protocols */}
                  <PreventionAndSafety ui={uiStrings} />

                  {/* 9. Recommended Agronomic Inputs */}
                  <RecommendedProducts result={result} />

                  {/* 10. Action Panel: PDF Export, Share, TTS, Ask AI, Request Expert Review */}
                  <ActionPanel 
                    result={result}
                    onDownloadPDF={handleDownloadPDF} 
                    onShare={handleShare}
                    onListen={handleListen}
                    onSaveHistory={handleSaveHistory}
                    onAskAI={handleAskAI}
                    onUpdateReport={(updated) => setResult(updated)}
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
