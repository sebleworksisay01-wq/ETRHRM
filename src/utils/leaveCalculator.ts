import { LeaveRecord, PublicHoliday, LeaveTypeItem } from '../types/hrms';

/**
 * Calculates working days between two dates, excluding Saturdays, Sundays,
 * and configured public holidays.
 */
export function calculateWorkingLeaveDays(
  startDateStr: string,
  endDateStr: string,
  holidays: PublicHoliday[]
): { days: number; excludedWeekends: number; excludedHolidays: number; holidayNames: string[] } {
  if (!startDateStr || !endDateStr) {
    return { days: 0, excludedWeekends: 0, excludedHolidays: 0, holidayNames: [] };
  }

  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { days: 0, excludedWeekends: 0, excludedHolidays: 0, holidayNames: [] };
  }

  const holidayDateMap = new Map<string, string>();
  holidays.forEach((h) => {
    holidayDateMap.set(h.date, h.name);
  });

  let workingDays = 0;
  let excludedWeekends = 0;
  let excludedHolidays = 0;
  const holidayNames: string[] = [];

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      excludedWeekends++;
    } else if (holidayDateMap.has(dateStr)) {
      excludedHolidays++;
      const name = holidayDateMap.get(dateStr)!;
      if (!holidayNames.includes(name)) {
        holidayNames.push(name);
      }
    } else {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    days: workingDays,
    excludedWeekends,
    excludedHolidays,
    holidayNames,
  };
}

/**
 * Checks if a proposed leave date range overlaps with any existing non-cancelled leave records.
 */
export function checkLeaveOverlap(
  employeeId: string,
  startDateStr: string,
  endDateStr: string,
  existingLeaves: LeaveRecord[],
  excludeRecordId?: string
): { hasOverlap: boolean; conflictingLeave?: LeaveRecord } {
  const startProposed = new Date(startDateStr + 'T00:00:00').getTime();
  const endProposed = new Date(endDateStr + 'T00:00:00').getTime();

  for (const record of existingLeaves) {
    if (record.employeeId !== employeeId) continue;
    if (excludeRecordId && record.id === excludeRecordId) continue;
    if (record.leaveStatus === 'Cancelled') continue;

    const recordStart = new Date(record.startDate + 'T00:00:00').getTime();
    const recordEnd = new Date(record.endDate + 'T00:00:00').getTime();

    // Standard interval overlap test: StartA <= EndB and EndA >= StartB
    if (startProposed <= recordEnd && endProposed >= recordStart) {
      return { hasOverlap: true, conflictingLeave: record };
    }
  }

  return { hasOverlap: false };
}

/**
 * Calculates leave balance for an employee across all leave types.
 */
export function calculateEmployeeLeaveBalance(
  employeeId: string,
  employeeName: string,
  leaveTypes: LeaveTypeItem[],
  leaveRecords: LeaveRecord[],
  overrideAnnualBalance?: number
) {
  let totalAllocated = 0;
  let totalUsed = 0;
  const byType: Record<string, { allocated: number; used: number; remaining: number }> = {};

  for (const lt of leaveTypes) {
    let allocated = lt.defaultDays;
    const isAnnual = lt.name.toLowerCase().includes('annual') || lt.code.toLowerCase().includes('ann');
    if (isAnnual && overrideAnnualBalance !== undefined && overrideAnnualBalance !== null && !isNaN(Number(overrideAnnualBalance))) {
      allocated = Number(overrideAnnualBalance);
    }

    // Sum used days for this employee and this leave type for Active or Completed status
    const used = leaveRecords
      .filter(
        (r) =>
          r.employeeId === employeeId &&
          r.leaveTypeId === lt.id &&
          (r.leaveStatus === 'Active' || r.leaveStatus === 'Completed')
      )
      .reduce((sum, r) => sum + r.numberOfDays, 0);

    const remaining = Math.max(0, allocated - used);

    byType[lt.id] = { allocated, used, remaining };
    totalAllocated += allocated;
    totalUsed += used;
  }

  return {
    employeeId,
    employeeName,
    allocatedDays: totalAllocated,
    usedDays: totalUsed,
    remainingDays: Math.max(0, totalAllocated - totalUsed),
    byType,
  };
}
