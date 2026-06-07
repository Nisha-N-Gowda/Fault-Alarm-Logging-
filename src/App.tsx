/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Severity, ErrorStatus, Machine, Alarm, CorrectiveAction, AlarmLogDoc, ConsoleLogEntry } from './types';
import { INITIAL_MACHINES, getInitialDatabaseData } from './data';
import MetricCards from './components/MetricCards';
import SimulatorControl from './components/SimulatorControl';
import DBViewer from './components/DBViewer';
import CorrectionModal from './components/CorrectionModal';
import QuerySandbox from './components/QuerySandbox';
import {
  ShieldAlert,
  Database,
  Grid,
  FileText,
  Activity,
  History,
  Info,
  CheckCircle,
  HelpCircle,
  Cpu,
  Layers,
  BookOpen,
  FolderDot,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Initialize states with seeded database records
  const [machines] = useState<Machine[]>(INITIAL_MACHINES);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [mongoLogs, setMongoLogs] = useState<AlarmLogDoc[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);

  // Selected alarm ID for the correction popup
  const [selectedResolveAlarmId, setSelectedResolveAlarmId] = useState<number | null>(null);

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState<'dashboard' | 'db_explorer' | 'query_sandbox' | 'portfolio_docs'>('dashboard');

  // Seed databases on initial layout mount
  useEffect(() => {
    const seed = getInitialDatabaseData();
    setAlarms(seed.alarms);
    setCorrectiveActions(seed.correctiveActions);
    setMongoLogs(seed.mongoLogs);

    // Initial console logs to establish real-time SCADA server simulation
    const initialLogs: ConsoleLogEntry[] = [
      {
        id: 'init-1',
        timestamp: new Date(Date.now() - 3600 * 1000).toLocaleTimeString(),
        type: 'info',
        db: 'Flask',
        message: 'Initializing FALS (Fault and Alarm Logging System) gateway...',
      },
      {
        id: 'init-2',
        timestamp: new Date(Date.now() - 3590 * 1000).toLocaleTimeString(),
        type: 'success',
        db: 'MySQL',
        message: 'Established MySQL Connection Pool successfully (Database: fault_logging_db, port: 3306). Relational integrity integrity-checks passed.',
      },
      {
        id: 'init-3',
        timestamp: new Date(Date.now() - 3580 * 1000).toLocaleTimeString(),
        type: 'success',
        db: 'MongoDB',
        message: 'Established MongoDB client pool (v6.0 Cluster, replicaSet: rs0, port: 27017). Colection: "alarm_logs" synchronized.',
      },
      {
        id: 'init-4',
        timestamp: new Date(Date.now() - 3570 * 1000).toLocaleTimeString(),
        type: 'info',
        db: 'WebSocket',
        message: 'SocketIO broadcast router active. Telemetry event listeners bound to localhost:3000.',
      },
      {
        id: 'init-5',
        timestamp: new Date(Date.now() - 3560 * 1000).toLocaleTimeString(),
        type: 'success',
        db: 'Flask',
        message: `FALS Simulator ready. Pre-populated database with 15 historic log instances. Status ~60% resolved.`,
      }
    ];
    setConsoleLogs(initialLogs);
  }, []);

  const addConsoleLog = (db: 'Flask' | 'MySQL' | 'MongoDB' | 'WebSocket', type: 'info' | 'success' | 'warn' | 'error' | 'websocket', message: string) => {
    const newEntry: ConsoleLogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      db,
      type,
      message,
    };
    setConsoleLogs((prev) => [newEntry, ...prev].slice(0, 80)); // Limit to matching list of 80 logs
  };

  // Triggers when a new alarm is injected (Manual or Automatic)
  const handleGenerateAlarm = (machineId: number, faultType: string, severity: Severity) => {
    const alarmId = alarms.length > 0 ? Math.max(...alarms.map((a) => a.alarm_id)) + 1 : 1;
    const actionId = correctiveActions.length > 0 ? Math.max(...correctiveActions.map((c) => c.action_id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const machineObj = machines.find((m) => m.machine_id === machineId)!;

    // 1. Append MySQL Alarms table
    const newAlarm: Alarm = {
      alarm_id: alarmId,
      machine_id: machineId,
      fault_type: faultType,
      alarm_time: nowIso,
      severity,
    };

    // 2. Append MySQL Corrective Actions table (Pending state)
    const newAction: CorrectiveAction = {
      action_id: actionId,
      alarm_id: alarmId,
      action_taken: '',
      action_time: '',
      status: ErrorStatus.PENDING,
    };

    // 3. Append MongoDB nested collection document
    const newMongoDoc: AlarmLogDoc = {
      alarm_id: alarmId,
      machine_id: machineId,
      machine_name: machineObj.machine_name,
      fault_type: faultType,
      alarm_time: nowIso,
      severity,
      action_taken: '',
      action_time: '',
      status: ErrorStatus.PENDING,
    };

    // Update state variables atomically to preserve Dual DB integrity
    setAlarms((prev) => [...prev, newAlarm]);
    setCorrectiveActions((prev) => [...prev, newAction]);
    setMongoLogs((prev) => [...prev, newMongoDoc]);

    // Create realistic console output simulation matching Page 7 diagrams
    addConsoleLog('Flask', 'info', `HTTP POST /api/alarms received from CNC/Gateway Client (ID: ${machineId}, Fault: ${faultType})`);
    
    // SQL insertion statement
    addConsoleLog(
      'MySQL', 
      'info', 
      `START TRANSACTION; \nINSERT INTO Alarms (alarm_id, machine_id, fault_type, severity, alarm_time) VALUES (${alarmId}, ${machineId}, '${faultType}', '${severity}', '${nowIso.substring(11, 19)}'); \nINSERT INTO Corrective_Actions (action_id, alarm_id, status) VALUES (${actionId}, ${alarmId}, 'Pending'); \nCOMMIT;`
    );

    // MongoDB document trigger
    addConsoleLog(
      'MongoDB',
      'success',
      `db.alarm_logs.insertOne({ alarm_id: ${alarmId}, machine_id: ${machineId}, machine_name: "${machineObj.machine_name}", fault_type: "${faultType}", severity: "${severity}", status: "Pending" }) [Execution: <12ms]`
    );

    // WebSocket Emission
    addConsoleLog(
      'WebSocket',
      'websocket',
      `emit("alarm_broadcast", { alarm_id: ${alarmId}, machine: "${machineObj.machine_name}", fault: "${faultType}", severity: "${severity}" })`
    );
  };

  // Triggers when operator resolves an interactive fault in real time
  const handleResolveFault = (alarmId: number, actionTaken: string) => {
    const nowIso = new Date().toISOString();

    // 1. Update MySQL Action
    setCorrectiveActions((prev) =>
      prev.map((c) => {
        if (c.alarm_id === alarmId) {
          return {
            ...c,
            action_taken: actionTaken,
            action_time: nowIso,
            status: ErrorStatus.RESOLVED,
          };
        }
        return c;
      })
    );

    // 2. Update Mongo document
    setMongoLogs((prev) =>
      prev.map((l) => {
        if (l.alarm_id === alarmId) {
          return {
            ...l,
            action_taken: actionTaken,
            action_time: nowIso,
            status: ErrorStatus.RESOLVED,
          };
        }
        return l;
      })
    );

    // Get info of resolved item for descriptive logging
    const targetDoc = mongoLogs.find((l) => l.alarm_id === alarmId);
    const mName = targetDoc ? targetDoc.machine_name : 'Machine';
    const fType = targetDoc ? targetDoc.fault_type : 'Fault';

    // Logging transactions
    addConsoleLog('Flask', 'success', `REST Endpoint PATCH /api/alarms/${alarmId}/resolve invoked. Corrective action filed.`);
    addConsoleLog(
      'MySQL',
      'info',
      `UPDATE Corrective_Actions SET action_taken='${actionTaken.substring(0, 30)}...', action_time='${nowIso.substring(11, 19)}', status='Resolved' WHERE alarm_id=${alarmId};`
    );
    addConsoleLog(
      'MongoDB',
      'success',
      `db.alarm_logs.updateOne({ alarm_id: ${alarmId} }, { $set: { status: "Resolved", action_taken: "${actionTaken.substring(0, 25)}...", action_time: "${nowIso.substring(11, 19)}" } })`
    );
    addConsoleLog(
      'WebSocket',
      'websocket',
      `emit("corrective_action_broadcast", { alarm_id: ${alarmId}, status: "Resolved", machine: "${mName}" })`
    );
  };

  // Find target pending alarm logs to handle Resolution triggers
  const activeSelectedAlarm = mongoLogs.find((l) => l.alarm_id === selectedResolveAlarmId) || null;

  // Render correct Tab content
  const renderTabContent = () => {
    switch (activeMainTab) {
      case 'dashboard':
        return (
          <div className="space-y-6" id="dashboard-tab-content">
            
            {/* Real-Time Formula Statistics */}
            <MetricCards logs={mongoLogs} />

            {/* Live Anomalies Monitor Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="live-monitors-panel">
              {/* Left Column: List of Active/Pending alarm items */}
              <div className="xl:col-span-4 bg-[#0A0A0A] border border-[#222] rounded-xl p-5 shadow-sm flex flex-col h-[400px] xl:h-auto min-h-[380px]">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#777] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                    Active Alarms ({mongoLogs.filter((l) => l.status === ErrorStatus.PENDING).length})
                  </h3>
                  <span className="text-[10px] bg-[#111] border border-[#222] text-[#888] px-2 py-0.5 rounded font-bold font-mono">
                    Pending Fixes
                  </span>
                </div>
                <p className="text-xs text-[#888] mb-4 leading-relaxed">
                  High-priority mechanical anomalies waiting for floor corrections. Click "Resolve" to apply corrective workflows.
                </p>

                {/* Vertical Scroll list */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {mongoLogs.filter((l) => l.status === ErrorStatus.PENDING).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                      <p className="text-xs font-semibold text-white">All Systems Clear</p>
                      <p className="text-[11px] text-[#666]">No active failures or alarm conditions on the factory floor.</p>
                    </div>
                  ) : (
                    mongoLogs
                      .filter((l) => l.status === ErrorStatus.PENDING)
                      .map((log) => {
                        let sevColor = 'border-l-blue-500';
                        let rowBg = 'bg-[#0E0E0E]';
                        if (log.severity === Severity.CRITICAL) {
                          sevColor = 'border-l-red-600';
                          rowBg = 'bg-[#1A1111]/40 border-red-900/20';
                        } else if (log.severity === Severity.HIGH) {
                          sevColor = 'border-l-amber-600';
                          rowBg = 'bg-[#1A1611]/30 border-amber-950/20';
                        } else if (log.severity === Severity.MEDIUM) {
                          sevColor = 'border-l-yellow-600';
                        }

                        return (
                          <motion.div
                            key={log.alarm_id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-3 border border-[#222] border-l-4 rounded-lg flex justify-between items-center gap-2 shadow-sm transition-all hover:border-[#333] ${rowBg} ${sevColor}`}
                          >
                            <div className="space-y-1 min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-[#555]">#{log.alarm_id}</span>
                                <span className="font-bold text-white text-xs truncate max-w-[120px]">
                                  {log.machine_name}
                                </span>
                              </div>
                              <p className="font-semibold text-red-400 text-[11px] truncate">{log.fault_type}</p>
                              <p className="text-[10px] text-[#555] font-mono">
                                {new Date(log.alarm_time).toLocaleTimeString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedResolveAlarmId(log.alarm_id)}
                              className="py-1 px-2.5 bg-white hover:bg-[#DDD] text-black font-bold text-[10px] rounded shadow-sm hover:shadow transition-all uppercase tracking-wider"
                              id={`resolve-btn-${log.alarm_id}`}
                            >
                              Resolve
                            </button>
                          </motion.div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Right Column: Simulator & Console Terminal */}
              <div className="xl:col-span-8">
                <SimulatorControl
                  onGenerateAlarm={handleGenerateAlarm}
                  logs={consoleLogs}
                  onClearLogs={() => setConsoleLogs([])}
                />
              </div>
            </div>

          </div>
        );

      case 'db_explorer':
        return (
          <DBViewer
            machines={machines}
            alarms={alarms}
            correctiveActions={correctiveActions}
            mongoLogs={mongoLogs}
            onTriggerResolve={(alarmId) => setSelectedResolveAlarmId(alarmId)}
          />
        );

      case 'query_sandbox':
        return (
          <QuerySandbox
            machines={machines}
            alarms={alarms}
            correctiveActions={correctiveActions}
            mongoLogs={mongoLogs}
          />
        );

      case 'portfolio_docs':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="portfolio-docs-layout">
            {/* Outline Card navigation */}
            <div className="lg:col-span-4 bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                Portfolio Structure
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Academic documentation summarizing the architecture of the Fault & Alarm Logging System. Designed for the Dept. of Automation & Robotics at KLE Technological University.
              </p>
              
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <div className="flex justify-between text-xs py-1.5 border-b border-slate-100 font-medium">
                  <span className="text-slate-500">Subject</span>
                  <span className="text-slate-800 font-semibold text-right">DB Management & Analytics</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-slate-100 font-medium">
                  <span className="text-slate-500">Department</span>
                  <span className="text-slate-800 font-semibold text-right">Automation & Robotics</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-slate-100 font-medium">
                  <span className="text-slate-500">University</span>
                  <span className="text-slate-800 font-semibold text-right">KLE Technological University</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 font-medium">
                  <span className="text-slate-500">Published</span>
                  <span className="text-slate-800 font-semibold text-right">June 2026</span>
                </div>
              </div>
            </div>

            {/* Doc contents */}
            <div className="lg:col-span-8 bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-6 text-slate-700 text-xs leading-relaxed">
              
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  1. Project Introduction & Objectives
                </h3>
                <p>
                  In modern heavy manufacturing environments, industrial machines continuously yield streaming alarm alerts and diagnostic records. Relational engines enforce rigid referential consistency across Machines, Incident catalogs, and staff Action logs. Meanwhile, high-frequency IoT data demands highly scalable, schemaless document stores that prevent relational JOIN limits under massive speeds.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <span className="font-bold text-blue-800 text-[11px] block mb-1">Relational Layer (MySQL)</span>
                    Enforces clear foreign keys between Machines, Alarms, and Corrective_Actions ensuring transactional ACID guarantees for audit logs.
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <span className="font-bold text-emerald-800 text-[11px] block mb-1">Document Layer (MongoDB)</span>
                    Maintains flat embedded structures containing complete error parameters to facilitate lightning-quick BSON lookups with zero JOINs.
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  2. Hybrid Database Methodology
                </h3>
                <p>
                  Events flowing from SCADA sensors are ingested simultaneously via matching REST models. Relational indexes (primary and foreign key relations) separate machines and action updates. Simultaneously, MongoDB binds matching flat documents in the <code>alarm_logs</code> collection.
                </p>
                
                {/* Visual flowchart mimicking page 7 block diagram */}
                <div className="my-4 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-around gap-4 text-center text-[10px] font-mono leading-tight">
                  <div className="bg-slate-800 text-white p-2.5 rounded-lg shadow-sm border border-slate-700 w-28">
                    FAULT EVENT
                    <span className="block text-[8px] mt-1 text-slate-300">SCADA/Manual</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 sm:rotate-0" />
                  <div className="bg-indigo-600 text-white p-2.5 rounded-lg shadow-sm border border-indigo-500 w-28">
                    FLASK SERVER
                    <span className="block text-[8px] mt-1 text-indigo-200">REST Payload</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 sm:rotate-0" />
                  <div className="flex flex-col gap-1.5">
                    <div className="bg-blue-600 text-white p-1.5 rounded shadow-sm w-28">MySQL DB</div>
                    <div className="bg-emerald-600 text-white p-1.5 rounded shadow-sm w-28">MongoDB</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 sm:rotate-0" />
                  <div className="bg-slate-900 text-yellow-400 p-2.5 rounded-lg shadow-sm border border-slate-800 w-28">
                    WEBSOCKET
                    <span className="block text-[8px] mt-1 text-slate-300">Live Dashboard</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <FolderDot className="w-4 h-4 text-indigo-600" />
                  3. Key Advantages vs Limitations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-800 border-b border-slate-100 pb-1 block">System Advantages</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500">
                      <li>Hybrid structure balances high throughput with strict relationship integrity.</li>
                      <li>Reduces query latency for live operator views to under 100ms.</li>
                      <li>Auto-recovers active synchronization without data-drift anomalies.</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-800 border-b border-slate-100 pb-1 block">Core Limitations</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500">
                      <li>Dual insertion doubles data volume overhead across resources.</li>
                      <li>Relational tables require manual migration schemas for new device layers.</li>
                      <li>No distributed dual-phase commit guarantees between separate engines.</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E2E2E2] font-sans selection:bg-[#222]" id="applet-main-canvas">
      
      {/* Dynamic Header imitating Sophisticated Dark aesthetic */}
      <header className="bg-[#0A0A0A] relative text-white pb-6 pt-8 px-6 sm:px-10 border-b border-[#222] shadow-sm">
        {/* Decorative branding elements */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[9px] tracking-[0.25em] font-bold text-[#666] uppercase block">
              DATABASE MANAGEMENT &amp; ANALYTICS / FALS GATEWAY
            </span>
            <h1 className="text-2xl sm:text-4xl font-serif italic text-white tracking-tight" id="app-title-banner">
              Vanguard.
            </h1>
            <p className="text-[#888] text-xs font-mono">
              Faculty Portfolio Report: Fault &amp; Alarm Logging System (FALS)
            </p>
          </div>

          {/* Academic meta badge */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-3 text-xs space-y-1 min-w-[200px] shadow-sm" id="academic-meta-badge">
            <div className="flex justify-between gap-2">
              <span className="text-[#555] font-mono">Department:</span>
              <span className="font-bold text-[#BBB]">Automation &amp; Robotics</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#555] font-mono">University:</span>
              <span className="font-bold text-[#BBB]">KLE Tech. University</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#555] font-mono">Published:</span>
              <span className="font-bold text-white font-mono">June 2026</span>
            </div>
          </div>
        </div>

        {/* Short Highlights Row on Header */}
        <div className="max-w-7xl mx-auto mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#111] p-2.5 rounded-lg border border-[#222] text-center">
            <span className="text-[9px] text-[#555] font-mono block uppercase tracking-wider">MySQL Engine</span>
            <span className="text-xs font-bold text-[#CCC] mt-0.5 block">3 Normalized Tables</span>
          </div>
          <div className="bg-[#111] p-2.5 rounded-lg border border-[#222] text-center">
            <span className="text-[9px] text-[#555] font-mono block uppercase tracking-wider">MongoDB BSON</span>
            <span className="text-xs font-bold text-[#CCC] mt-0.5 block">Denormalized Docs</span>
          </div>
          <div className="bg-[#111] p-2.5 rounded-lg border border-[#222] text-center">
            <span className="text-[9px] text-[#555] font-mono block uppercase tracking-wider">API Synced</span>
            <span className="text-xs font-bold text-emerald-500 mt-0.5 block">Real-Time WebSocket</span>
          </div>
          <div className="bg-[#111] p-2.5 rounded-lg border border-[#222] text-center">
            <span className="text-[9px] text-[#555] font-mono block uppercase tracking-wider">Status Updates</span>
            <span className="text-xs font-bold text-white mt-0.5 block">Active Live Control</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Tab-Selector Navigation Bar */}
        <div className="flex border-b border-[#222] gap-1 overflow-x-auto pb-px" id="main-nav-tabs">
          <button
            type="button"
            onClick={() => setActiveMainTab('dashboard')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs uppercase tracking-[0.15em] border-b-2 transition-all cursor-pointer ${
              activeMainTab === 'dashboard'
                ? 'border-white text-white bg-[#0E0E0E]'
                : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live SCADA Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('db_explorer')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs uppercase tracking-[0.15em] border-b-2 transition-all cursor-pointer ${
              activeMainTab === 'db_explorer'
                ? 'border-white text-white bg-[#0E0E0E]'
                : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Hybrid DB Explorer
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('query_sandbox')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs uppercase tracking-[0.15em] border-b-2 transition-all cursor-pointer ${
              activeMainTab === 'query_sandbox'
                ? 'border-white text-white bg-[#0E0E0E]'
                : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Polyglot Query Sandbox
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('portfolio_docs')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs uppercase tracking-[0.15em] border-b-2 transition-all cursor-pointer ${
              activeMainTab === 'portfolio_docs'
                ? 'border-white text-white bg-[#0E0E0E]'
                : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Portfolio Information
          </button>
        </div>

        {/* Dynamic Inner views */}
        <div className="pb-16">{renderTabContent()}</div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0A0A0A] border-t border-[#222] py-8 text-center text-xs text-[#555] font-mono">
        <p>KLE Technological University | Dept. of Automation &amp; Robotics | Page 1 to 17</p>
        <p className="mt-1 text-[10px] text-[#444]">
          Faculty Portfolio Project — Designed &amp; Maintained with strict real-time hybrid database coordination.
        </p>
      </footer>

      {/* Real-Time Corrective Action Resolver Modal pop-up Overlay */}
      <CorrectionModal
        alarm={activeSelectedAlarm}
        onClose={() => setSelectedResolveAlarmId(null)}
        onResolve={handleResolveFault}
      />
    </div>
  );
}
