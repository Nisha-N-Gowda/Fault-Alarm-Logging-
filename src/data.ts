/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Machine, Severity, ErrorStatus, Alarm, CorrectiveAction, AlarmLogDoc } from './types';

export const INITIAL_MACHINES: Machine[] = [
  { machine_id: 1, machine_name: 'CNC Machine', department: 'Production & Machining', location: 'Bay A' },
  { machine_id: 2, machine_name: 'Lathe', department: 'Production & Machining', location: 'Bay B' },
  { machine_id: 3, machine_name: 'Conveyor', department: 'Logistics & Transport', location: 'Bay C' },
  { machine_id: 4, machine_name: 'Hydraulic Press', department: 'Metal Stamping', location: 'Bay D' },
  { machine_id: 5, machine_name: 'Welding Robot', department: 'Robotic Assembly', location: 'Bay E' },
];

export const FAULT_CATALOG = [
  {
    type: 'Overheating',
    category: 'Thermal',
    defaultSeverity: Severity.CRITICAL,
    suggestedAction: 'Cooling system checked, refilled coolant loop and verified pump flow.',
  },
  {
    type: 'Vibration',
    category: 'Mechanical',
    defaultSeverity: Severity.HIGH,
    suggestedAction: 'Inspected rotor, tightened pneumatic clamping bolts, and balanced shaft.',
  },
  {
    type: 'Power Failure',
    category: 'Electrical',
    defaultSeverity: Severity.CRITICAL,
    suggestedAction: 'Reset primary air circuit breaker and cleared transient earth fault.',
  },
  {
    type: 'Pressure Drop',
    category: 'Hydraulic',
    defaultSeverity: Severity.HIGH,
    suggestedAction: 'Replaced torn polymer pressure seal in pneumatic cylinder line.',
  },
  {
    type: 'Comms Offline',
    category: 'Software',
    defaultSeverity: Severity.MEDIUM,
    suggestedAction: 'Repowered network transceiver module and restarted Modbus TCP daemon.',
  },
  {
    type: 'Mechanical Jam',
    category: 'Mechanical',
    defaultSeverity: Severity.HIGH,
    suggestedAction: 'Cleared high-density material obstruction from conveyor drive sprocket.',
  },
  {
    type: 'Calibration Error',
    category: 'Precision',
    defaultSeverity: Severity.LOW,
    suggestedAction: 'Recalibrated linear displacement encoder via reference laser measurement.',
  },
  {
    type: 'Voltage Spike',
    category: 'Electrical',
    defaultSeverity: Severity.MEDIUM,
    suggestedAction: 'Replaced metal-oxide varistor surge supressor in main servo distribution box.',
  },
];

// Seed some initial data to make the report look filled out (~25 logs, ~60% resolution)
// This lets the user see exactly the same layout and metrics (or very close) as on page 11
export function getInitialDatabaseData() {
  const alarms: Alarm[] = [];
  const correctiveActions: CorrectiveAction[] = [];
  const mongoLogs: AlarmLogDoc[] = [];

  // Seed events spanning the last few hours
  const now = new Date('2026-06-07T15:38:42Z');

  // Hardcode ~19 seeded records carefully to reach stats
  const preGenData = [
    { machineId: 1, faultIdx: 0, hoursAgo: 5, solved: true, durationMin: 22 }, // Overheating CNC
    { machineId: 3, faultIdx: 5, hoursAgo: 4.5, solved: true, durationMin: 15 }, // Jam Conveyor
    { machineId: 5, faultIdx: 1, hoursAgo: 4, solved: false, durationMin: 0 }, // Vibration Robot
    { machineId: 2, faultIdx: 6, hoursAgo: 3.5, solved: true, durationMin: 12 }, // Calibration Lathe
    { machineId: 4, faultIdx: 3, hoursAgo: 3, solved: false, durationMin: 0 }, // Pressure Press
    { machineId: 1, faultIdx: 0, hoursAgo: 2.5, solved: true, durationMin: 35 }, // Overheating CNC (Max recurrence test)
    { machineId: 1, faultIdx: 2, hoursAgo: 2, solved: true, durationMin: 45 }, // Power CNC
    { machineId: 5, faultIdx: 4, hoursAgo: 1.8, solved: true, durationMin: 8 }, // Comms Robot
    { machineId: 3, faultIdx: 5, hoursAgo: 1.5, solved: false, durationMin: 0 }, // Jam Conveyor
    { machineId: 4, faultIdx: 7, hoursAgo: 1.2, solved: true, durationMin: 18 }, // Voltage Press
    { machineId: 1, faultIdx: 0, hoursAgo: 1.0, solved: false, durationMin: 0 }, // Overheating CNC (3x recurrence!)
    { machineId: 2, faultIdx: 1, hoursAgo: 0.8, solved: true, durationMin: 28 }, // Vibration Lathe
    { machineId: 5, faultIdx: 4, hoursAgo: 0.5, solved: false, durationMin: 0 }, // Comms Robot
    { machineId: 4, faultIdx: 3, hoursAgo: 0.3, solved: true, durationMin: 14 }, // Pressure Press
    { machineId: 3, faultIdx: 6, hoursAgo: 0.1, solved: false, durationMin: 0 }, // Calibration Conveyor
  ];

  preGenData.forEach((item, index) => {
    const alarmId = index + 1;
    const actionId = index + 1;
    const m = INITIAL_MACHINES.find((ma) => ma.machine_id === item.machineId)!;
    const f = FAULT_CATALOG[item.faultIdx];

    const alarmTimeStr = new Date(now.getTime() - item.hoursAgo * 60 * 60 * 1000).toISOString();
    let actionTimeStr = '';
    let actionTaken = '';
    let status = ErrorStatus.PENDING;

    if (item.solved) {
      status = ErrorStatus.RESOLVED;
      actionTimeStr = new Date(new Date(alarmTimeStr).getTime() + item.durationMin * 60 * 1000).toISOString();
      actionTaken = f.suggestedAction;
    }

    // Push to MySQL simulation state
    alarms.push({
      alarm_id: alarmId,
      machine_id: item.machineId,
      fault_type: f.type,
      alarm_time: alarmTimeStr,
      severity: f.defaultSeverity,
    });

    correctiveActions.push({
      action_id: actionId,
      alarm_id: alarmId,
      action_taken: actionTaken,
      action_time: actionTimeStr,
      status: status,
    });

    // Push to Mongo collection
    mongoLogs.push({
      alarm_id: alarmId,
      machine_id: item.machineId,
      machine_name: m.machine_name,
      fault_type: f.type,
      alarm_time: alarmTimeStr,
      severity: f.defaultSeverity,
      action_taken: actionTaken,
      action_time: actionTimeStr,
      status: status,
    });
  });

  return { alarms, correctiveActions, mongoLogs };
}
