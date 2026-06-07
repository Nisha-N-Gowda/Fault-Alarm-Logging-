/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlarmLogDoc, Machine, Alarm, CorrectiveAction, ErrorStatus } from '../types';
import { Code, Terminal, Play, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QueryOption {
  id: string;
  title: string;
  description: string;
  sql: string;
  mongo: string;
  executor: (context: {
    machines: Machine[];
    alarms: Alarm[];
    correctiveActions: CorrectiveAction[];
    mongoLogs: AlarmLogDoc[];
  }) => any[];
}

const QUERIES: QueryOption[] = [
  {
    id: 'join_report',
    title: 'Relational JOIN Query',
    description: 'Retrieve all alarm incidents, joining Machine metadata and status in SQL vs standard Mongo find projection.',
    sql: `SELECT \n  a.alarm_id, \n  m.machine_name, \n  a.fault_type, \n  a.severity, \n  c.status\nFROM Alarms a\nJOIN Machines m ON a.machine_id = m.machine_id\nLEFT JOIN Corrective_Actions c ON a.alarm_id = c.alarm_id\nORDER BY a.alarm_id DESC;`,
    mongo: `db.alarm_logs.find(\n  {},\n  {\n    alarm_id: 1,\n    machine_name: 1,\n    fault_type: 1,\n    severity: 1,\n    status: 1\n  }\n).sort({ alarm_id: -1 });`,
    executor: (ctx) => {
      return ctx.alarms.map((a) => {
        const m = ctx.machines.find((ma) => ma.machine_id === a.machine_id);
        const c = ctx.correctiveActions.find((ca) => ca.alarm_id === a.alarm_id);
        return {
          alarm_id: a.alarm_id,
          machine_name: m ? m.machine_name : 'Unknown',
          fault_type: a.fault_type,
          severity: a.severity,
          status: c ? c.status : 'Pending',
        };
      }).reverse(); // Sort descending
    },
  },
  {
    id: 'high_severe',
    title: 'Filter High & Critical Severity',
    description: 'Locate only highest risk incidents using SQL Boolean logic vs Mongo document aggregation selectors.',
    sql: `SELECT * \nFROM Alarms \nWHERE severity IN ('Critical', 'High')\nORDER BY alarm_time DESC;`,
    mongo: `db.alarm_logs.find(\n  {\n    severity: { $in: ["Critical", "High"] }\n  }\n).sort({ alarm_time: -1 });`,
    executor: (ctx) => {
      return ctx.mongoLogs
        .filter((l) => l.severity === 'Critical' || l.severity === 'High')
        .map((l) => ({
          alarm_id: l.alarm_id,
          machine_name: l.machine_name,
          fault_type: l.fault_type,
          severity: l.severity,
          status: l.status,
        }))
        .reverse();
    },
  },
  {
    id: 'group_by_recurrence',
    title: 'Identify Recurring Fault Patterns (GROUP BY / HAVING)',
    description: 'Locate machine & fault combinations which have recurring failures (> 1 incidence) to prompt maintenance optimization audits.',
    sql: `SELECT \n  m.machine_name, \n  a.fault_type, \n  COUNT(*) as occurrences\nFROM Alarms a\nJOIN Machines m ON a.machine_id = m.machine_id\nGROUP BY m.machine_name, a.fault_type\nHAVING COUNT(*) > 1\nORDER BY occurrences DESC;`,
    mongo: `db.alarm_logs.aggregate([\n  {\n    $group: {\n      _id: { \n        machine: "$machine_name", \n        fault: "$fault_type" \n      },\n      occurrences: { $sum: 1 }\n    }\n  },\n  {\n    $match: { occurrences: { $gt: 1 } }\n  },\n  { $sort: { occurrences: -1 } }\n]);`,
    executor: (ctx) => {
      // Group by machine + fault
      const groups: Record<string, { machine_name: string; fault_type: string; occurrences: number }> = {};
      ctx.alarms.forEach((a) => {
        const m = ctx.machines.find((ma) => ma.machine_id === a.machine_id);
        const name = m ? m.machine_name : 'Unknown';
        const key = `${name}||${a.fault_type}`;
        if (!groups[key]) {
          groups[key] = { machine_name: name, fault_type: a.fault_type, occurrences: 0 };
        }
        groups[key].occurrences += 1;
      });

      // Filter having > 1
      return Object.values(groups)
        .filter((g) => g.occurrences > 1)
        .sort((x, y) => y.occurrences - x.occurrences);
    },
  },
  {
    id: 'pending_alarms',
    title: 'Pending Action Isolation',
    description: 'Retrieve unresolved alarms swiftly to allow immediate operator intervention.',
    sql: `SELECT \n  a.alarm_id, \n  m.machine_name, \n  a.fault_type, \n  c.status\nFROM Alarms a\nJOIN Machines m ON a.machine_id = m.machine_id\nJOIN Corrective_Actions c ON a.alarm_id = c.alarm_id\nWHERE c.status = 'Pending';`,
    mongo: `db.alarm_logs.find(\n  { status: "Pending" }\n);`,
    executor: (ctx) => {
      return ctx.mongoLogs
        .filter((l) => l.status === ErrorStatus.PENDING)
        .map((l) => ({
          alarm_id: l.alarm_id,
          machine_name: l.machine_name,
          fault_type: l.fault_type,
          status: l.status,
          severity: l.severity,
        }));
    },
  },
];

interface QuerySandboxProps {
  machines: Machine[];
  alarms: Alarm[];
  correctiveActions: CorrectiveAction[];
  mongoLogs: AlarmLogDoc[];
}

export default function QuerySandbox({ machines, alarms, correctiveActions, mongoLogs }: QuerySandboxProps) {
  const [selectedQueryId, setSelectedQueryId] = useState<string>(QUERIES[0].id);
  const [activeLangTab, setActiveLangTab] = useState<'sql' | 'mongodb'>('sql');
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const activeQuery = QUERIES.find((q) => q.id === selectedQueryId) || QUERIES[0];

  const handleExecuteQuery = () => {
    setIsExecuting(true);
    // Simulate compilation delay for high graphic UI look
    setTimeout(() => {
      const results = activeQuery.executor({ machines, alarms, correctiveActions, mongoLogs });
      setQueryResult(results);
      setIsExecuting(false);
    }, 450);
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 shadow-sm" id="query-sandbox-panel">
      <div className="flex justify-between items-center border-b border-[#222] pb-4 mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#777] flex items-center gap-2">
            <Code className="w-3.5 h-3.5" />
            Polyglot Query Simulator
          </h3>
          <p className="text-xs text-[#555] font-mono mt-1">Compare Relational SQL Queries against NoSQL MongoDB Document Queries</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Queries selection list */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <label className="block text-[10px] font-bold font-mono uppercase text-[#555] mb-1.5">
            Choose Query Objective
          </label>
          {QUERIES.map((q) => {
            const isSelected = q.id === selectedQueryId;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setSelectedQueryId(q.id);
                  setQueryResult(null); // Reset results when swapping queries
                }}
                className={`text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#444] bg-[#111] text-white shadow-sm'
                    : 'border-[#222] bg-transparent hover:bg-[#111]/30 text-[#888]'
                }`}
              >
                <h4 className="font-bold flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#333]'}`}></span>
                  {q.title}
                </h4>
                <p className="text-[10px] text-[#555] leading-snug mt-1 truncate font-mono">
                  {q.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Code display and Execution Result */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Editor Header tabs */}
          <div className="bg-[#0E0E0E] rounded-xl overflow-hidden shadow border border-[#222] flex flex-col font-mono text-xs">
            <div className="flex border-b border-[#222] bg-black px-4 py-2.5 justify-between items-center">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLangTab('sql')}
                  className={`text-[10px] uppercase font-bold py-1 px-2.5 rounded cursor-pointer ${
                    activeLangTab === 'sql' ? 'bg-[#1C1C1C] text-white border border-[#333]' : 'text-[#666] hover:text-white'
                  }`}
                >
                  MySQL Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab('mongodb')}
                  className={`text-[10px] uppercase font-bold py-1 px-2.5 rounded cursor-pointer ${
                    activeLangTab === 'mongodb' ? 'bg-[#1C1C1C] text-white border border-[#333]' : 'text-[#666] hover:text-white'
                  }`}
                >
                  MongoDB Script
                </button>
              </div>
              <button
                onClick={handleExecuteQuery}
                disabled={isExecuting}
                className="bg-white hover:bg-[#DDD] text-black font-bold px-3.5 py-1.5 text-[10px] rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                id="btn-execute-sandbox-query"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isExecuting ? 'Compiling...' : 'Execute Query'}
              </button>
            </div>

            {/* Editor Console Display */}
            <div className="p-4 bg-black text-[#CCC] overflow-x-auto min-h-[140px] leading-relaxed">
              <pre className="text-[11px] font-mono whitespace-pre-wrap">
                {activeLangTab === 'sql' ? activeQuery.sql : activeQuery.mongo}
              </pre>
            </div>
          </div>

          {/* Results display */}
          <div className="border border-[#222] rounded-xl p-4 min-h-[140px] flex flex-col justify-between bg-black/40">
            <h4 className="text-[10px] font-bold font-mono text-[#555] uppercase tracking-wider mb-2 flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" />
              Console Query Output
            </h4>

            {isExecuting ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#555] text-xs gap-1.5 py-6">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                <span className="font-mono">Compiling engine nodes & joining tables...</span>
              </div>
            ) : queryResult === null ? (
              <div className="flex-1 flex items-center justify-center text-[#555] text-xs italic py-6">
                Click "Execute Query" above to run this query against the active hybrid DB logs dynamically.
              </div>
            ) : queryResult.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-mono py-6">
                Empty set (0 rows found matching query parameters).
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#222] rounded-lg bg-black max-h-[180px] scrollbar-thin">
                <table className="w-full text-left border-collapse text-[10.5px] font-mono text-white">
                  <thead>
                    <tr className="bg-[#111] border-b border-[#222] text-[#555] font-bold uppercase">
                      {Object.keys(queryResult[0]).map((key) => (
                        <th key={key} className="p-2">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.map((row, idx) => (
                      <tr key={idx} className="border-b border-[#111] hover:bg-[#111]/30">
                        {Object.values(row).map((val: any, sIdx) => {
                          let displayVal = String(val);
                          let cellStyle = 'text-[#BBB]';
                          if (displayVal === 'Resolved') {
                            cellStyle = 'text-emerald-400 font-bold';
                          } else if (displayVal === 'Pending') {
                            cellStyle = 'text-amber-400 font-bold';
                          } else if (displayVal === 'Critical') {
                            cellStyle = 'text-rose-400 font-bold';
                          } else if (typeof val === 'number') {
                            cellStyle = 'text-blue-400 font-mono';
                          }
                          return (
                            <td key={sIdx} className={`p-2 truncate max-w-xs ${cellStyle}`}>{displayVal}</td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
