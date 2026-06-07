/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Severity, Machine, ConsoleLogEntry } from '../types';
import { INITIAL_MACHINES, FAULT_CATALOG } from '../data';
import { Play, Square, Send, Terminal, RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SimulatorControlProps {
  onGenerateAlarm: (machineId: number, faultType: string, severity: Severity) => void;
  logs: ConsoleLogEntry[];
  onClearLogs: () => void;
}

export default function SimulatorControl({ onGenerateAlarm, logs, onClearLogs }: SimulatorControlProps) {
  // Manual generator inputs
  const [selectedMachineId, setSelectedMachineId] = useState<number>(INITIAL_MACHINES[0].machine_id);
  const [selectedFaultIdx, setSelectedFaultIdx] = useState<number>(0);
  const [customSeverity, setCustomSeverity] = useState<Severity | 'default'>('default');

  // Auto generator state
  const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);
  const [intervalSec, setIntervalSec] = useState<number>(5);

  const autoGenTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-generator effect
  useEffect(() => {
    if (isAutoGenerating) {
      const runGeneration = () => {
        // Pick a random machine
        const randMachine = INITIAL_MACHINES[Math.floor(Math.random() * INITIAL_MACHINES.length)];
        // Pick a random fault
        const randFault = FAULT_CATALOG[Math.floor(Math.random() * FAULT_CATALOG.length)];
        
        onGenerateAlarm(randMachine.machine_id, randFault.type, randFault.defaultSeverity);
        
        // Schedule next with a slight random variance (±1s) to make it look like a natural Poisson-like process
        const variance = (Math.random() * 2 - 1) * 1000; // ±1s
        const nextDelay = Math.max(2000, intervalSec * 1000 + variance);
        autoGenTimerRef.current = setTimeout(runGeneration, nextDelay);
      };

      autoGenTimerRef.current = setTimeout(runGeneration, intervalSec * 1000);
    } else {
      if (autoGenTimerRef.current) {
        clearTimeout(autoGenTimerRef.current);
        autoGenTimerRef.current = null;
      }
    }

    return () => {
      if (autoGenTimerRef.current) {
        clearTimeout(autoGenTimerRef.current);
      }
    };
  }, [isAutoGenerating, intervalSec, onGenerateAlarm]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fault = FAULT_CATALOG[selectedFaultIdx];
    const severity = customSeverity === 'default' ? fault.defaultSeverity : customSeverity;
    onGenerateAlarm(selectedMachineId, fault.type, severity);
  };

  const selectedFaultObject = FAULT_CATALOG[selectedFaultIdx];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="simulator-container">
      {/* Simulation Controls Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
               {/* Module 1: Automated Generator */}
        <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#777] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Auto Event Generator
            </h3>
            {isAutoGenerating ? (
              <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-900 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 animate-pulse">
                <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                RUNNING
              </span>
            ) : (
              <span className="text-[10px] bg-[#111] border border-[#222] text-[#666] px-2.5 py-0.5 rounded-full font-medium">
                STOPPED
              </span>
            )}
          </div>
          <p className="text-xs text-[#888] leading-relaxed mb-4">
            Emulate a continuous stream of telemetry errors captured by a background SCADA controller, dispatching HTTP REST calls & WebSockets.
          </p>

          <div className="space-y-4">
            {/* Speed slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#555] mb-1">
                <span>Polling Interval:</span>
                <span className="font-semibold text-[#CCC]">{intervalSec} seconds</span>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                step="1"
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
                className="w-full h-1 bg-[#222] rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] text-[#555] mt-1">
                <span>3s (Aggressive)</span>
                <span>10s (Relaxed)</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {!isAutoGenerating ? (
                <button
                  type="button"
                  onClick={() => setIsAutoGenerating(true)}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-[#DDD] text-black font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  id="btn-auto-start"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Auto Stream
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAutoGenerating(false)}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  id="btn-auto-stop"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop Auto Stream
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Module 2: Manual Trigger Form */}
        <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#777] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Manual Fault Logger (Operator Panel)
          </h3>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Machine dropdown */}
            <div>
              <label className="block text-[10px] font-bold font-mono uppercase text-[#555] mb-1.5">
                Target Industrial Machine
              </label>
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(Number(e.target.value))}
                className="w-full text-xs border border-[#222] rounded-lg p-2.5 bg-[#111] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#444]"
              >
                {INITIAL_MACHINES.map((machine) => (
                  <option key={machine.machine_id} value={machine.machine_id} className="bg-[#111]">
                    {machine.machine_name} [{machine.location}]
                  </option>
                ))}
              </select>
            </div>

            {/* Fault Type dropdown */}
            <div>
              <label className="block text-[10px] font-bold font-mono uppercase text-[#555] mb-1.5">
                Reported Failure Mode
              </label>
              <select
                value={selectedFaultIdx}
                onChange={(e) => setSelectedFaultIdx(Number(e.target.value))}
                className="w-full text-xs border border-[#222] rounded-lg p-2.5 bg-[#111] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#444]"
              >
                {FAULT_CATALOG.map((f, idx) => (
                  <option key={f.type} value={idx} className="bg-[#111]">
                    {f.type} [{f.category}]
                  </option>
                ))}
              </select>
            </div>

            {/* Severity and default preview */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold font-mono uppercase text-[#555] mb-1.5">
                  Alert Severity
                </label>
                <select
                  value={customSeverity}
                  onChange={(e) => setCustomSeverity(e.target.value as Severity | 'default')}
                  className="w-full text-xs border border-[#222] rounded-lg p-2.5 bg-[#111] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#444]"
                >
                  <option value="default" className="bg-[#111]">Default Type ({selectedFaultObject?.defaultSeverity})</option>
                  <option value={Severity.CRITICAL} className="bg-[#111]">Critical</option>
                  <option value={Severity.HIGH} className="bg-[#111]">High</option>
                  <option value={Severity.MEDIUM} className="bg-[#111]">Medium</option>
                  <option value={Severity.LOW} className="bg-[#111]">Low</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <span className="text-[10px] text-[#555] font-mono">Suggested Mitigation:</span>
                <span className="text-[11px] text-[#888] truncate italic font-serif mt-1">
                  "{selectedFaultObject?.suggestedAction}"
                </span>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333] text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              id="btn-manual-trigger"
            >
              <Send className="w-3.5 h-3.5" />
              Inject Manual Alarm Event
            </button>
          </form>
        </div>
      </div>

      {/* Real-time System Logs Console Terminal */}
      <div className="lg:col-span-7 flex flex-col h-[400px] lg:h-auto min-h-[380px]">
        <div className="bg-[#0A0A0A] text-[#CCC] rounded-xl border border-[#222] shadow-xl flex-1 flex flex-col overflow-hidden relative font-mono text-xs">
          {/* Terminal Banner Header */}
          <div className="bg-[#0E0E0E] px-4 py-3 border-b border-[#222] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-white text-xs font-mono">FALS Backend Console (Polyglot Stream)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-[#555] font-semibold font-mono">WS Live</span>
              </div>
              <button
                onClick={onClearLogs}
                className="text-[#555] hover:text-white transition-colors cursor-pointer"
                title="Clear logs"
                id="btn-clear-console"
                type="button"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Console Output Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[380px] scrollbar-thin bg-black">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#555] font-mono text-xs space-y-2 py-10">
                <ShieldAlert className="w-6 h-6 text-[#333] animate-pulse" />
                <p>System fully optimized. Listening for stream anomalies...</p>
              </div>
            ) : (
              logs.map((log) => {
                let badgeColor = 'bg-[#111] text-slate-400 border border-[#222]';
                let msgColor = 'text-slate-400';

                if (log.type === 'success') {
                  badgeColor = 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30';
                  msgColor = 'text-emerald-300';
                } else if (log.type === 'warn') {
                  badgeColor = 'bg-amber-950/40 text-amber-400 border border-amber-900/30';
                  msgColor = 'text-amber-300';
                } else if (log.type === 'error') {
                  badgeColor = 'bg-red-950/40 text-red-400 border border-red-900/30';
                  msgColor = 'text-red-300';
                } else if (log.type === 'websocket') {
                  badgeColor = 'bg-blue-950/40 text-blue-400 border border-blue-900/30';
                  msgColor = 'text-blue-300';
                }

                return (
                  <div key={log.id} className="leading-relaxed border-b border-[#111] pb-2 flex flex-col gap-1 hover:bg-[#050505] px-1 py-0.5 rounded transition-all">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-[#444] font-sans">[{log.timestamp}]</span>
                      <span className={`text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded ${badgeColor}`}>
                        {log.db}
                      </span>
                    </div>
                    <span className={`${msgColor} text-[11px] whitespace-pre-line`}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
