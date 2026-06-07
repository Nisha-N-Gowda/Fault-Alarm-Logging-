/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlarmLogDoc } from '../types';
import { X, CheckSquare, ClipboardList, PenTool, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FAULT_CATALOG } from '../data';

interface CorrectionModalProps {
  alarm: AlarmLogDoc | null;
  onClose: () => void;
  onResolve: (alarmId: number, actionTaken: string) => void;
}

export default function CorrectionModal({ alarm, onClose, onResolve }: CorrectionModalProps) {
  const [actionText, setActionText] = useState<string>('');

  // Reset actionText when a new alarm is selected
  useEffect(() => {
    if (alarm) {
      // Find the suggested action from the catalog
      const match = FAULT_CATALOG.find((f) => f.type === alarm.fault_type);
      setActionText(match ? match.suggestedAction : '');
    }
  }, [alarm]);

  if (!alarm) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionText.trim()) return;
    onResolve(alarm.alarm_id, actionText);
    onClose();
  };

  const handleSuggestClick = (suggestion: string) => {
    setActionText(suggestion);
  };

  const matchedCatalog = FAULT_CATALOG.find((f) => f.type === alarm.fault_type);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" id="correction-modal-overlay">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0C0C0C] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#222]"
          id="correction-modal-container"
        >
          {/* Header */}
          <div className="bg-black px-6 py-4 flex justify-between items-center text-white border-b border-[#222]">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-4.5 h-4.5 text-amber-500" />
              <div>
                <h3 className="font-bold text-xs uppercase tracking-[0.2em]">Submit Corrective Action</h3>
                <p className="text-[9px] text-[#555] font-mono mt-0.5">Simulating Dual DB SQL/NoSQL Update</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#555] hover:text-white transition-colors cursor-pointer"
              id="btn-close-modal"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Alarm context summary card */}
            <div className="bg-black border border-[#1C1C1C] rounded-lg p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between items-center font-mono">
                <span className="text-[#555] font-bold">ALARM EVENT #{alarm.alarm_id}</span>
                <span className="text-[9px] bg-red-950/50 text-red-400 border border-red-900/40 px-1.5 py-0.2 rounded font-bold uppercase tracking-wide">{alarm.severity}</span>
              </div>
              <p className="text-[#AAA]">
                Machine: <span className="text-blue-400 font-semibold">{alarm.machine_name}</span> (ID: <span className="font-mono text-[#777]">{alarm.machine_id}</span>)
              </p>
              <p className="text-[#AAA]">
                Failure Mode: <span className="text-red-400 font-semibold">{alarm.fault_type}</span>
              </p>
              <p className="text-[#555] font-mono text-[10px]">
                Logged On: {new Date(alarm.alarm_time).toLocaleString()}
              </p>
            </div>

            {/* Suggested actions block */}
            {matchedCatalog && (
              <div className="bg-amber-950/10 border border-amber-900/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wide">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Operator Suggestion (from Fault DB Specs)
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed italic paragraph-serif md:text-sm">
                  "{matchedCatalog.suggestedAction}"
                </p>
                <button
                  type="button"
                  onClick={() => handleSuggestClick(matchedCatalog.suggestedAction)}
                  className="text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 underline block cursor-pointer transition-all"
                >
                  Apply Suggested Correction Text
                </button>
              </div>
            )}

            {/* Input form */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold font-mono uppercase text-[#555] flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5" />
                Correction Log (Action Taken)
              </label>
              <textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                rows={3}
                placeholder="Describe physical/digital remedies performed on the factory floor..."
                className="w-full text-xs border border-[#222] rounded-lg p-3 bg-black text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 placeholder-slate-600 font-sans leading-relaxed"
                required
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-end pt-4 border-t border-[#222]">
              <button
                type="button"
                onClick={onClose}
                className="py-1.5 px-4 border border-[#222] hover:bg-[#111] hover:border-[#333] text-[#888] font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                id="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-1.5 px-4 bg-white hover:bg-[#DDD] text-black font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer text-center"
                id="btn-modal-submit"
              >
                <CheckSquare className="w-4 h-4 text-black" />
                Apply Injection &rarr;
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
