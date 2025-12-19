
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CallSummary } from '../types';

interface SummaryModalProps {
  isOpen: boolean;
  summary: CallSummary;
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, summary, onClose }) => {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Developer: Trigger Twilio SMS Backend call here
    setTimeout(onClose, 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3.5rem] p-10 z-[101] shadow-[0_-25px_50px_rgba(0,0,0,0.3)] border-t-4 border-sky-100 max-w-xl mx-auto"
          >
            <div className="w-16 h-2 bg-slate-200 rounded-full mx-auto mb-10" />
            
            <h2 className="text-3xl font-black text-slate-900 mb-2 text-center">
              {submitted ? "DISPATCH LOG SENT" : "CALL COMPLETE"}
            </h2>
            <p className="text-slate-500 text-center mb-10 font-bold uppercase tracking-widest text-xs">
              {submitted ? "Twilio SMS confirmed" : "AI processed while you slept"}
            </p>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 mb-10 border-4 border-sky-400 shadow-2xl">
              <h3 className="text-[11px] font-black text-sky-400 uppercase tracking-[0.3em] mb-6 italic">EXTRACTED INTEL (ELITE OPS)</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Customer</span>
                  <span className="text-white font-black text-lg">{summary.name || "DETECTED"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Vehicle</span>
                  <span className="text-white font-black text-lg">{summary.vehicle || "DETECTED"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Location</span>
                  <span className="text-sky-400 font-black text-lg">{summary.location || "DETECTED"}</span>
                </div>
              </div>
            </div>

            {!submitted && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">
                    Twilio SMS Target Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-100 border-4 border-transparent focus:border-sky-500 rounded-3xl px-8 py-6 text-slate-900 font-black text-xl focus:outline-none transition-all shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black py-7 rounded-3xl transition-all shadow-2xl shadow-sky-200 active:scale-[0.97] uppercase tracking-[0.2em] text-lg border-b-8 border-sky-800"
                >
                  Confirm SMS Dispatch
                </button>
              </form>
            )}
            
            {submitted && (
              <div className="text-center py-10">
                <motion.div 
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-green-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <p className="text-slate-900 font-black text-2xl uppercase italic tracking-tighter">Mission Success!</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SummaryModal;
