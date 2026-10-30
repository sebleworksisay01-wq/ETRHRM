import { Employee } from '../types/hrms';

/**
 * Normalizes an Employee ID by trimming whitespace, collapsing multiple internal spaces,
 * and converting to uppercase.
 * Example: " emp-001 " -> "EMP-001", "er001" -> "ER001"
 */
export function normalizeEmployeeId(id: string | null | undefined): string {
  if (!id) return '';
  return id.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Encodes a normalized Employee ID into a safe Firestore document ID
 */
export function getEmployeeIdDocKey(id: string): string {
  const normalized = normalizeEmployeeId(id);
  // Replace characters not recommended in Firestore document IDs (/ and .)
  return normalized.replace(/[\/\.\s]/g, '_');
}

export interface EmployeeIdValidationResult {
  isValid: boolean;
  error?: string;
  normalizedId: string;
}

/**
 * Validates Employee ID format and uniqueness against existing employees in memory.
 * If targetDocId is provided (editing mode), ignores the record with that document ID.
 */
export function validateEmployeeId(
  rawId: string,
  existingEmployees: Employee[],
  targetEmployeeIdOrDocId?: string
): EmployeeIdValidationResult {
  const trimmed = (rawId || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Employee ID is mandatory. Please enter a valid Employee ID.',
      normalizedId: '',
    };
  }

  const normalized = normalizeEmployeeId(trimmed);

  // Check against all existing employees
  const duplicate = existingEmployees.find((emp) => {
    // If editing, skip the employee record being edited
    if (
      targetEmployeeIdOrDocId &&
      (emp.id === targetEmployeeIdOrDocId ||
        emp.employeeId === targetEmployeeIdOrDocId ||
        normalizeEmployeeId(emp.employeeId) === normalizeEmployeeId(targetEmployeeIdOrDocId))
    ) {
      return false;
    }

    return (
      normalizeEmployeeId(emp.employeeId) === normalized ||
      normalizeEmployeeId(emp.id) === normalized
    );
  });

  if (duplicate) {
    return {
      isValid: false,
      error: 'Employee ID already exists. Please enter a unique Employee ID.',
      normalizedId: normalized,
    };
  }

  return {
    isValid: true,
    normalizedId: normalized,
  };
}

export interface EmployeeIdIntegrityIssue {
  type: 'duplicate' | 'missing' | 'inconsistent';
  employeeId: string;
  normalizedId: string;
  affectedEmployees: {
    id: string;
    employeeId: string;
    fullName: string;
    email: string;
    departmentName: string;
  }[];
  description: string;
}

export interface EmployeeIdIntegrityReport {
  totalEmployees: number;
  uniqueIdsCount: number;
  hasIssues: boolean;
  issues: EmployeeIdIntegrityIssue[];
  cleanEmployeesCount: number;
}

/**
 * Audits all existing employee records for:
 * 1. Duplicate Employee IDs (case-insensitive & trimmed)
 * 2. Missing or empty Employee IDs
 * 3. Inconsistent records
 */
export function auditEmployeeIdIntegrity(employees: Employee[]): EmployeeIdIntegrityReport {
  const issues: EmployeeIdIntegrityIssue[] = [];
  const idMap = new Map<string, Employee[]>();
  const missingList: Employee[] = [];

  for (const emp of employees) {
    const rawId = emp.employeeId || '';
    const norm = normalizeEmployeeId(rawId);

    if (!norm) {
      missingList.push(emp);
      continue;
    }

    const currentGroup = idMap.get(norm) || [];
    currentGroup.push(emp);
    idMap.set(norm, currentGroup);
  }

  // Detect missing IDs
  if (missingList.length > 0) {
    issues.push({
      type: 'missing',
      employeeId: '(Missing)',
      normalizedId: '',
      affectedEmployees: missingList.map((e) => ({
        id: e.id,
        employeeId: e.employeeId || '(None)',
        fullName: e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
        email: e.email || '',
        departmentName: e.departmentName || '',
      })),
      description: `${missingList.length} employee record(s) do not have a defined Employee ID.`,
    });
  }

  // Detect duplicate IDs
  for (const [normId, group] of idMap.entries()) {
    if (group.length > 1) {
      issues.push({
        type: 'duplicate',
        employeeId: group[0].employeeId,
        normalizedId: normId,
        affectedEmployees: group.map((e) => ({
          id: e.id,
          employeeId: e.employeeId,
          fullName: e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
          email: e.email || '',
          departmentName: e.departmentName || '',
        })),
        description: `Employee ID "${normId}" is assigned to ${group.length} different employee records.`,
      });
    }
  }

  const duplicateEmployeesCount = issues
    .filter((i) => i.type === 'duplicate')
    .reduce((acc, curr) => acc + curr.affectedEmployees.length, 0);

  const cleanEmployeesCount = employees.length - duplicateEmployeesCount - missingList.length;

  return {
    totalEmployees: employees.length,
    uniqueIdsCount: idMap.size,
    hasIssues: issues.length > 0,
    issues,
    cleanEmployeesCount: Math.max(0, cleanEmployeesCount),
  };
}
