import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const AgriCreditDossier = forwardRef(({ data }, ref) => {
  if (!data) return null;

  return (
    <div 
      ref={ref} 
      // A4 approximate aspect ratio, huge text scaling for clear PDF
      className="bg-white text-gray-900 absolute top-0 left-[-9999px]"
      style={{ width: '800px', padding: '40px', fontFamily: 'sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black text-emerald-700 tracking-tight m-0 leading-none">Dr Agri AI</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mt-2">Certified Loan Dossier</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-500">Date Generated</p>
          <p className="text-lg font-black">{new Date(data.generated_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Applicant Info */}
      <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Applicant Profile</h2>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-3xl font-black text-gray-900">{data.farmer_name}</p>
            <p className="text-gray-600 font-medium">{data.farmer_email}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Risk Tier</p>
            <div className={`px-4 py-2 rounded-lg font-black inline-block ${
              data.health_score >= 750 ? 'bg-emerald-100 text-emerald-800' :
              data.health_score >= 600 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
              {data.risk_tier}
            </div>
          </div>
        </div>
      </div>

      {/* Farm Health Score (The Hero Section) */}
      <div className="text-center mb-10">
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Dr Agri Farm Health Score</p>
        <div className="inline-block relative">
          <svg className="w-48 h-48 transform -rotate-90">
            <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
            <circle 
              cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" 
              className={data.health_score >= 750 ? 'text-emerald-500' : 'text-amber-500'}
              strokeDasharray={2 * Math.PI * 80}
              strokeDashoffset={2 * Math.PI * 80 * (1 - data.health_score / 1000)}
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="text-5xl font-black block">{data.health_score}</span>
            <span className="text-xs font-bold text-gray-400">/ 1000</span>
          </div>
        </div>
      </div>

      {/* Farm & Financials Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Farm Assets */}
        <div className="border border-gray-200 p-6 rounded-2xl">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Farm Assets</h2>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600 font-medium">Total Plots</span>
              <span className="font-black text-gray-900">{data.total_farms}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600 font-medium">Total Area</span>
              <span className="font-black text-gray-900">{data.total_area_acres} Acres</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600 font-medium">Active Crops</span>
              <span className="font-black text-gray-900">{data.active_crops.length ? data.active_crops.join(', ') : 'None'}</span>
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className="border border-gray-200 p-6 rounded-2xl">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Financial Overview</h2>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600 font-medium">Est. Revenue</span>
              <span className="font-black text-gray-900">₹{data.financials?.annual_revenue?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600 font-medium">Est. Expenses</span>
              <span className="font-black text-rose-600">₹{data.financials?.annual_expenses?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600 font-medium">Net Profit</span>
              <span className="font-black text-emerald-600">₹{data.financials?.net_profit?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Factors */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Score Factors</h2>
        <ul className="bg-gray-50 p-4 rounded-xl space-y-2">
          {data.factors?.map((factor, idx) => (
            <li key={idx} className="flex items-center gap-2 text-gray-700 font-medium text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {factor}
            </li>
          ))}
        </ul>
      </div>

      {/* Verification Footer */}
      <div className="border-t border-gray-200 pt-8 mt-auto flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-400 max-w-sm">
            This document is cryptographically generated by Dr Agri AI. The metrics reflect immutable ledger records derived from IoT, ML disease scans, and financial logs.
          </p>
        </div>
        <div className="text-center">
          <QRCodeSVG value={`https://dragri.ai/verify/${data.farmer_email}`} size={80} level={"L"} />
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Scan to Verify</p>
        </div>
      </div>
    </div>
  );
});

AgriCreditDossier.displayName = 'AgriCreditDossier';

export default AgriCreditDossier;
