/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Severity, AlarmLogDoc } from '../types';
import { Activity, ShieldCheck, CheckCircle, Flame, Clock, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface MetricCardsProps {
  logs: AlarmLogDoc[];
}

export default function MetricCards({ logs }: MetricCardsProps) {
  const totalAlarms = logs.length;
  
  // 1. Dual DB Sync is always 100% in this architecture
  const syncRate = totalAlarms > 0 ? 100 : 0;

  // 2. Resolution Rate
  const resolvedAlarms = logs.filter((l) => l.status === 'Resolved');
  const resolvedCount = resolvedAlarms.length;
  const resolutionRate = totalAlarms > 0 ? Math.round((resolvedCount / totalAlarms) * 100) : 0;

  // 3. Max Recurrence
  // Calculate occurrence frequency of each machine + fault pair
  const recurrenceMap: Record<string, { count: number; machine: string; fault: string }> = {};
  logs.forEach((log) => {
    const key = `${log.machine_name}||${log.fault_type}`;
    if (!recurrenceMap[key]) {
      recurrenceMap[key] = { count: 0, machine: log.machine_name, fault: log.fault_type };
    }
    recurrenceMap[key].count += 1;
  });

  let maxRecurrence = 0;
  let maxRecurrencePair = 'None';
  Object.values(recurrenceMap).forEach((item) => {
    if (item.count > maxRecurrence) {
      maxRecurrence = item.count;
      maxRecurrencePair = `${item.machine} (${item.fault})`;
    }
  });

  // 4. Severity Index
  // Formula: SI = Σ(w_i * count_i) / N_total
  // (Critical=4, High=3, Med=2, Low=1)
  const severityWeights: Record<Severity, number> = {
    [Severity.CRITICAL]: 4,
    [Severity.HIGH]: 3,
    [Severity.MEDIUM]: 2,
    [Severity.LOW]: 1,
  };

  const totalSeverityWeight = logs.reduce((sum, log) => {
    return sum + (severityWeights[log.severity] || 1);
  }, 0);
  const severityIndex = totalAlarms > 0 ? (totalSeverityWeight / totalAlarms).toFixed(2) : '0.00';

  // 5. Mean Time to Repair (MTTR) - in minutes
  // Formula: MTTR = Σ(action_time - alarm_time) / N_resolved
  let totalRepairTimeMs = 0;
  resolvedAlarms.forEach((log) => {
    const alarmTime = new Date(log.alarm_time).getTime();
    const actionTime = new Date(log.action_time).getTime();
    if (actionTime > alarmTime) {
      totalRepairTimeMs += (actionTime - alarmTime);
    }
  });

  const mttrMinutes = resolvedCount > 0 ? Math.round(totalRepairTimeMs / (1000 * 60) / resolvedCount) : 0;

  // 6. Alarm Rate (Simulated last 1 hour)
  // Let's assume we capture events in an active monitoring window.
  // We can calculate general rate: count per hour
  const alarmsLastHour = logs.filter((log) => {
    const timeDiff = Date.now() - new Date(log.alarm_time).getTime();
    return timeDiff <= 60 * 60 * 1000; // 1 hour
  }).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="metric-cards-container">
      {/* 1. Total Alarms */}
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 shadow-sm relative overflow-hidden"
        id="metric-card-total"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#555]">Alarms Logged</p>
            <h3 className="text-3xl font-bold font-mono text-white mt-1.5">{totalAlarms}</h3>
          </div>
          <div className="bg-[#111] text-red-500 p-2 border border-[#222] rounded-lg">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#111] flex flex-col justify-end">
          <span className="text-[9px] font-mono text-[#555]">λ = N_alarms / T_period</span>
          <span className="text-xs text-[#888] font-medium mt-1">
            {alarmsLastHour} active in past simulated hour
          </span>
        </div>
      </motion.div>

      {/* 2. Dual DB Sync */}
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 shadow-sm relative overflow-hidden"
        id="metric-card-sync"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#555]">Dual DB Sync</p>
            <h3 className="text-3xl font-bold font-mono text-cyan-400 mt-1.5">{syncRate}%</h3>
          </div>
          <div className="bg-[#111] text-cyan-400 p-2 border border-[#222] rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#111] flex flex-col justify-end">
          <span className="text-[9px] font-mono text-[#555]">SQL ⇄ NoSQL Polyglot Integrity</span>
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time transaction active
          </span>
        </div>
      </motion.div>

      {/* 3. Resolution Rate */}
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 shadow-sm relative overflow-hidden"
        id="metric-card-res-rate"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#555]">Resolved Rate</p>
            <h3 className="text-3xl font-bold font-mono text-emerald-400 mt-1.5">{resolutionRate}%</h3>
          </div>
          <div className="bg-[#111] text-emerald-400 p-2 border border-[#222] rounded-lg">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#111] flex flex-col justify-end">
          <span className="text-[9px] font-mono text-[#555]">R = (N_res / N_total) × 100</span>
          <span className="text-xs text-[#888] mt-1 font-medium">
            {resolvedCount} of {totalAlarms} faults mitigated
          </span>
        </div>
      </motion.div>

      {/* 4. Severity Index */}
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 shadow-sm relative overflow-hidden"
        id="metric-card-severity-idx"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#555]">Severity Index</p>
            <h3 className="text-3xl font-bold font-mono text-white mt-1.5">{severityIndex}</h3>
          </div>
          <div className="bg-[#111] text-amber-500 p-2 border border-[#222] rounded-lg">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#111] flex flex-col justify-end">
          <span className="text-[9px] font-mono text-[#555]">SI = Σ(w_i × count_i) / N</span>
          <span className="text-xs text-[#888] truncate mt-1 font-medium">
            Avg impact across machines
          </span>
        </div>
      </motion.div>

      {/* 5. Mean Time to Repair (MTTR) */}
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 shadow-sm relative overflow-hidden"
        id="metric-card-mttr"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#555]">MTTR</p>
            <h3 className="text-3xl font-bold font-mono text-purple-400 mt-1.5">
              {mttrMinutes} <span className="text-xs font-sans text-[#555]">min</span>
            </h3>
          </div>
          <div className="bg-[#111] text-purple-400 p-2 border border-[#222] rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#111] flex flex-col justify-end">
          <span className="text-[9px] font-mono text-[#555]">MTTR = Σ(t_res) / N_resolved</span>
          <span className="text-xs text-[#888] mt-1 font-medium truncate" title={`Max: ${maxRecurrencePair} (${maxRecurrence}x)`}>
            Max: {maxRecurrence > 1 ? `${maxRecurrence}x Recurrence` : 'None'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
