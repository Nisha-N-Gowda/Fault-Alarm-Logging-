/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Machine, Alarm, CorrectiveAction, AlarmLogDoc, ErrorStatus, Severity } from '../types';
import { Database, FileJson, AlertCircle, CheckCircle2, ShieldAlert, BadgeInfo, Play, ListCollapse, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DBViewerProps {
  machines: Machine[];
  alarms: Alarm[];
  correctiveActions: CorrectiveAction[];
  mongoLogs: AlarmLogDoc[];
  onTriggerResolve: (alarmId: number) => void;
}

export default function DBViewer({
  machines,
  alarms,
  correctiveActions,
  mongoLogs,
  onTriggerResolve,
}: DBViewerProps) {
  const [activeTab, setActiveTab] = useState<'mysql' | 'mongodb'>('mysql');
  const [mysqlSelectedTable, setMysqlSelectedTable] = useState<'machines' | 'alarms' | 'corrective_actions'>('alarms');
  
  // Highlight tracking for MySQL relational matching
  const [selectedAlarmId, setSelectedAlarmId] = useState<number | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);

  const handleAlarmRowClick = (alarm: Alarm) => {
    setSelectedAlarmId(alarm.alarm_id);
    setSelectedMachineId(alarm.machine_id);
  };

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case Severity.CRITICAL:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case Severity.HIGH:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case Severity.MEDIUM:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case Severity.LOW:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#222] rounded-xl shadow-sm overflow-hidden" id="db-viewer-workspace">
      {/* Tab Switcher Bar */}
      <div className="flex border-b border-[#222] bg-[#0E0E0E]/50 p-2 justify-between items-center flex-wrap gap-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('mysql')}
            className={`flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
              activeTab === 'mysql'
                ? 'bg-[#1C1C1C] text-white border border-[#333] shadow-sm'
                : 'text-[#666] hover:text-white'
            }`}
            id="tab-mysql-db"
          >
            <Database className="w-3.5 h-3.5" />
            MySQL Relational (Normalized)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mongodb')}
            className={`flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
              activeTab === 'mongodb'
                ? 'bg-[#1C1C1C] text-white border border-[#333] shadow-sm'
                : 'text-[#666] hover:text-white'
            }`}
            id="tab-mongo-db"
          >
            <FileJson className="w-3.5 h-3.5" />
            MongoDB Documents (Embedded)
          </button>
        </div>
        
        {/* Helper Tip */}
        <p className="text-[10px] sm:text-xs text-[#555] italic pr-3 font-medium">
          {activeTab === 'mysql' 
            ? '🚀 Tip: Click Alarm Row to highlight FK dependencies across relational tables!' 
            : '💡 Tip: Denormalized flat model contains all metadata in a single document!'}
        </p>
      </div>

      {/* MySQL Workspace */}
      <AnimatePresence mode="wait">
        {activeTab === 'mysql' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            key="mysql-workspace"
            className="p-5"
          >
            {/* MySQL Inner Table Selector */}
            <div className="flex gap-2 mb-4 border-b border-[#222] pb-3 overflow-x-auto">
              <button
                type="button"
                onClick={() => setMysqlSelectedTable('machines')}
                className={`py-1.5 px-3.5 text-[11px] font-bold font-mono rounded border transition-all cursor-pointer ${
                  mysqlSelectedTable === 'machines'
                    ? 'bg-blue-950/20 text-blue-400 border-blue-900/50 shadow-sm'
                    : 'bg-transparent text-[#666] border-[#222] hover:border-[#333]'
                }`}
                id="btn-mysql-table-machines"
              >
                Machines Table ({machines.length} rows)
              </button>
              <button
                type="button"
                onClick={() => setMysqlSelectedTable('alarms')}
                className={`py-1.5 px-3.5 text-[11px] font-bold font-mono rounded border transition-all cursor-pointer ${
                  mysqlSelectedTable === 'alarms'
                    ? 'bg-red-950/20 text-red-400 border-red-900/50 shadow-sm'
                    : 'bg-transparent text-[#666] border-[#222] hover:border-[#333]'
                }`}
                id="btn-mysql-table-alarms"
              >
                Alarms Table ({alarms.length} rows)
              </button>
              <button
                type="button"
                onClick={() => setMysqlSelectedTable('corrective_actions')}
                className={`py-1.5 px-3.5 text-[11px] font-bold font-mono rounded border transition-all cursor-pointer ${
                  mysqlSelectedTable === 'corrective_actions'
                    ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50 shadow-sm'
                    : 'bg-transparent text-[#666] border-[#222] hover:border-[#333]'
                }`}
                id="btn-mysql-table-corrective"
              >
                Corrective_Actions Table ({correctiveActions.length} rows)
              </button>
            </div>

            {/* Simulated Table Component */}
            <div className="overflow-x-auto border border-[#222] rounded-lg">
              
              {/* MACHINES TABLE */}
              {mysqlSelectedTable === 'machines' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#111] font-mono text-[#555] font-bold uppercase border-b border-[#222]">
                      <th className="p-3">machine_id (PK)</th>
                      <th className="p-3">machine_name</th>
                      <th className="p-3">department</th>
                      <th className="p-3">location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((machine) => {
                      const isHighlighted = selectedMachineId === machine.machine_id;
                      return (
                        <tr
                          key={machine.machine_id}
                          className={`border-b border-[#111] transition-colors ${
                            isHighlighted ? 'bg-blue-950/30 font-semibold' : 'hover:bg-[#111]/30'
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-blue-400">{machine.machine_id}</td>
                          <td className="p-3 font-medium text-white">{machine.machine_name}</td>
                          <td className="p-3 text-[#888]">{machine.department}</td>
                          <td className="p-3 font-mono text-[#666]">{machine.location}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* ALARMS TABLE */}
              {mysqlSelectedTable === 'alarms' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#111] font-mono text-[#555] font-bold uppercase border-b border-[#222]">
                      <th className="p-3">alarm_id (PK)</th>
                      <th className="p-3">machine_id (FK)</th>
                      <th className="p-3">fault_type</th>
                      <th className="p-3">alarm_time</th>
                      <th className="p-3">severity</th>
                      <th className="p-3 text-right">Corrective Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alarms.map((alarm) => {
                      const isHighlighted = selectedAlarmId === alarm.alarm_id;
                      const hasAction = correctiveActions.find((c) => c.alarm_id === alarm.alarm_id);
                      const isResolved = hasAction?.status === ErrorStatus.RESOLVED;

                      let rowClass = 'hover:bg-[#111]/30';
                      if (isHighlighted) {
                        rowClass = 'bg-red-950/20 font-semibold';
                      }

                      let sevStyle = 'border-[#222] text-[#888]';
                      if (alarm.severity === Severity.CRITICAL) sevStyle = 'bg-red-950/20 text-red-400 border-red-900/40';
                      else if (alarm.severity === Severity.HIGH) sevStyle = 'bg-amber-950/20 text-amber-400 border-amber-900/40';
                      else if (alarm.severity === Severity.MEDIUM) sevStyle = 'bg-yellow-950/20 text-yellow-300 border-yellow-900/40';

                      return (
                        <tr
                          key={alarm.alarm_id}
                          onClick={() => handleAlarmRowClick(alarm)}
                          className={`border-b border-[#111] transition-colors cursor-pointer ${rowClass}`}
                        >
                          <td className="p-3 font-mono font-bold text-[#AAA]">{alarm.alarm_id}</td>
                          <td className="p-3 font-mono font-semibold text-blue-400">
                            {alarm.machine_id} <span className="text-[10px] font-sans text-[#555] font-normal">({machines.find(m => m.machine_id === alarm.machine_id)?.machine_name || '?'})</span>
                          </td>
                          <td className="p-3 font-semibold text-white">{alarm.fault_type}</td>
                          <td className="p-3 font-mono text-[#888]">{new Date(alarm.alarm_time).toLocaleTimeString()} {new Date(alarm.alarm_time).toLocaleDateString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${sevStyle}`}>
                              {alarm.severity}
                            </span>
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {isResolved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                                <CheckCircle2 className="w-3 h-3" /> Resolved
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onTriggerResolve(alarm.alarm_id)}
                                className="inline-flex items-center gap-1 py-1 px-2.5 bg-white hover:bg-[#DDD] text-black font-bold text-[10px] rounded shadow-sm transition-colors uppercase tracking-wider cursor-pointer"
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* CORRECTIVE_ACTIONS TABLE */}
              {mysqlSelectedTable === 'corrective_actions' && (
                <table className="w-full text-left border-collapse text-xs text-white">
                  <thead>
                    <tr className="bg-[#111] font-mono text-[#555] font-bold uppercase border-b border-[#222]">
                      <th className="p-3">action_id (PK)</th>
                      <th className="p-3">alarm_id (FK)</th>
                      <th className="p-3">action_taken</th>
                      <th className="p-3">action_time</th>
                      <th className="p-3">status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correctiveActions.map((action) => {
                      const isHighlighted = selectedAlarmId === action.alarm_id;
                      return (
                        <tr
                          key={action.action_id}
                          className={`border-b border-[#111] transition-colors ${
                            isHighlighted ? 'bg-emerald-950/20 font-semibold text-white' : 'hover:bg-[#111]/30'
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-[#777]">{action.action_id}</td>
                          <td className="p-3 font-mono font-semibold text-red-400">{action.alarm_id}</td>
                          <td className="p-3 font-sans max-w-xs truncate text-[#CCC]" title={action.action_taken}>
                            {action.action_taken || <span className="text-[#444] italic">No action logged yet</span>}
                          </td>
                          <td className="p-3 font-mono text-[#888]">
                            {action.action_time ? `${new Date(action.action_time).toLocaleTimeString()} ${new Date(action.action_time).toLocaleDateString()}` : <span className="text-[#333]">-</span>}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 font-semibold ${
                              action.status === ErrorStatus.RESOLVED ? 'text-emerald-400' : 'text-[#555]'
                            }`}>
                              {action.status === ErrorStatus.RESOLVED ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#333]"></span>
                              )}
                              {action.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}

        {/* MongoDB Workspace */}
        {activeTab === 'mongodb' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            key="mongodb-workspace"
            className="p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-xs text-white tracking-wider uppercase font-mono">
                  Collection: alarm_logs ({mongoLogs.length} documents)
                </span>
              </div>
              <span className="text-[10px] font-mono bg-[#111] border border-[#222] text-[#888] px-2 py-0.5 rounded">
                db.alarm_logs.find()
              </span>
            </div>

            {/* Document Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {mongoLogs.map((log) => {
                const isPending = log.status === ErrorStatus.PENDING;
                return (
                  <div
                    key={log.alarm_id}
                    className={`border rounded-xl font-mono text-[11px] leading-relaxed transition-all shadow-sm ${
                      isPending 
                        ? 'border-amber-900/40 bg-[#1A1611]/30' 
                        : 'border-[#222] bg-[#0E0E0E]'
                    }`}
                  >
                    {/* Header bar of Doc */}
                    <div className="flex justify-between items-center px-4 py-2.5 bg-[#0A0A0A] border-b border-inherit rounded-t-xl">
                      <span className="text-white font-bold opacity-80">_id: {log.alarm_id}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          log.severity === Severity.CRITICAL ? 'bg-red-950/80 text-red-400 border border-red-900/40' : 'bg-[#111] text-[#777] border border-[#222]'
                        }`}>
                          {log.severity}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isPending ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                        }`} />
                      </div>
                    </div>

                    {/* Pre Document representation */}
                    <div className="p-4 overflow-x-auto text-[#BBB] max-h-[200px] bg-black">
                      <span className="text-[#555] font-bold">{'{'}</span>
                      <div className="pl-4 space-y-0.5 font-mono">
                        <p><span className="text-purple-400">"alarm_id"</span>: <span className="text-amber-400">{log.alarm_id}</span>,</p>
                        <p><span className="text-purple-400">"machine_id"</span>: <span className="text-amber-400">{log.machine_id}</span>,</p>
                        <p><span className="text-purple-400">"machine_name"</span>: <span className="text-emerald-400">"{log.machine_name}"</span>,</p>
                        <p><span className="text-purple-400">"fault_type"</span>: <span className="text-emerald-400">"{log.fault_type}"</span>,</p>
                        <p><span className="text-purple-400">"alarm_time"</span>: <span className="text-[#888]">"{log.alarm_time}"</span>,</p>
                        <p><span className="text-purple-400">"severity"</span>: <span className="text-emerald-400">"{log.severity}"</span>,</p>
                        <p><span className="text-purple-400">"action_taken"</span>: <span className="text-emerald-400">{log.action_taken ? `"${log.action_taken}"` : 'null'}</span>,</p>
                        <p><span className="text-purple-400">"action_time"</span>: <span className="text-[#888]">{log.action_time ? `"${log.action_time}"` : 'null'}</span>,</p>
                        <p><span className="text-purple-400">"status"</span>: <span className="text-cyan-400">"{log.status}"</span></p>
                      </div>
                      <span className="text-[#555] font-bold">{'}'}</span>
                    </div>

                    {/* Resolve button directly inside document footer when pending */}
                    {isPending && (
                      <div className="px-4 py-2 border-t border-amber-900/40 bg-[#14120F] rounded-b-xl flex justify-end">
                        <button
                          type="button"
                          onClick={() => onTriggerResolve(log.alarm_id)}
                          className="py-1 px-3 bg-white hover:bg-[#DDD] text-black font-bold text-[10px] rounded shadow-sm transition-all cursor-pointer"
                        >
                          Resolve Alarm BSON Doc &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
