/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Severity {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum ErrorStatus {
  PENDING = 'Pending',
  RESOLVED = 'Resolved',
}

// MySQL - Machines Table Schema
export interface Machine {
  machine_id: number;
  machine_name: string;
  department: string;
  location: string;
}

// MySQL - Alarms Table Schema
export interface Alarm {
  alarm_id: number;
  machine_id: number;
  fault_type: string;
  alarm_time: string;
  severity: Severity;
}

// MySQL - Corrective_Actions Table Schema
export interface CorrectiveAction {
  action_id: number;
  alarm_id: number;
  action_taken: string;
  action_time: string;
  status: ErrorStatus;
}

// MongoDB - alarm_logs collection document schema (polymorphic / embedded structure)
export interface AlarmLogDoc {
  alarm_id: number;
  machine_id: number;
  machine_name: string;
  fault_type: string;
  alarm_time: string;
  severity: Severity;
  action_taken: string;
  action_time: string;
  status: ErrorStatus;
}

export interface MetricSummary {
  alarmRate: number; // alarm count per simulated time period
  faultFrequencyList: Array<{ machine: string; fault: string; count: number }>;
  resolutionRate: number; // resolved / total * 100
  severityIndex: number; // weighted sum / total
  mttr: number; // Mean Time to Repair (average duration in seconds / minutes)
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'websocket';
  db: 'Flask' | 'MySQL' | 'MongoDB' | 'WebSocket';
  message: string;
}
