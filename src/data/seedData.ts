import {
  User,
  Employee,
  Department,
  AttendanceRecord,
  LeaveRecord,
  LeaveTypeItem,
  PublicHoliday,
  CompanyProfile,
  BrandingSettings,
  ActivityLog,
} from '../types/hrms';

export const INITIAL_BRANDING: BrandingSettings = {
  primaryColor: '#002855', // Geometric Balance Deep Corporate Blue
  secondaryColor: '#004080', // Supporting Geometric Blue
  accentColor: '#D4AF37', // Warm Gold Geometric Accent
  companyDisplayName: 'Ethiopian Reinsurance S.C. (Ethio-Re)',
  companyLogo: '',
};

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  displayName: 'Ethiopian Reinsurance S.C. (Ethio-Re)',
  legalName: 'Ethiopian Reinsurance Share Company',
  shortName: 'Ethio-Re',
  logo: '',
  email: 'info@ethiore.com',
  phoneNumber: '+251 11 557 5757',
  website: 'https://www.ethiore.com',
  address: 'Kirkos Sub-City, Woreda 01, Africa Avenue, Kirkos Real Estate Bldg',
  city: 'Addis Ababa',
  country: 'Ethiopia',
  postalCode: 'P.O. Box 12687',
  taxId: 'TIN-0048291048',
  description:
    'Ethiopian Reinsurance S.C. (Ethio-Re) is the pioneer national reinsurer in Ethiopia, providing professional and robust reinsurance capacity and risk management services across Africa and beyond.',
  industry: 'Financial Services & Reinsurance',
  registrationNumber: 'NBR/001/2016',
  establishedYear: 2016,
  officialEmail: 'info@ethiore.com',
  officialPhone: '+251 11 557 5757',
};

// No demo users - All accounts are authentic Firebase Auth accounts
export const INITIAL_USERS: User[] = [];

// No demo departments - Registered by authorized HR/Admin
export const INITIAL_DEPARTMENTS: Department[] = [];

// No demo employees - Registered by HR or via self-service registration
export const INITIAL_EMPLOYEES: Employee[] = [];

// Standard statutory leave types configuration (Statutory Ethiopian Labor Code)
export const INITIAL_LEAVE_TYPES: LeaveTypeItem[] = [
  {
    id: 'lt-annual',
    name: 'Annual Leave',
    code: 'AL',
    defaultDays: 16,
    isPaid: true,
    description: 'Standard statutory annual earned vacation leave.',
  },
  {
    id: 'lt-sick',
    name: 'Sick Leave',
    code: 'SL',
    defaultDays: 30,
    isPaid: true,
    description: 'Medical recuperation leave supported by authorized medical certificate.',
  },
  {
    id: 'lt-maternity',
    name: 'Maternity Leave',
    code: 'ML',
    defaultDays: 120,
    isPaid: true,
    description: 'Statutory paid maternity leave for female employees upon childbirth.',
  },
  {
    id: 'lt-paternity',
    name: 'Paternity Leave',
    code: 'PL',
    defaultDays: 10,
    isPaid: true,
    description: 'Paternity leave for male employees upon birth of child.',
  },
  {
    id: 'lt-bereavement',
    name: 'Bereavement Leave',
    code: 'BL',
    defaultDays: 5,
    isPaid: true,
    description: 'Compassionate leave for immediate family mourning.',
  },
  {
    id: 'lt-study',
    name: 'Study Leave',
    code: 'STL',
    defaultDays: 15,
    isPaid: true,
    description: 'Authorized leave for professional qualification exams and study.',
  },
  {
    id: 'lt-unpaid',
    name: 'Unpaid Leave',
    code: 'UPL',
    defaultDays: 0,
    isPaid: false,
    description: 'Special authorized personal leave without compensation.',
  },
];

// Official Public Holidays Calendar
export const INITIAL_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { id: 'hol-01', name: 'Ethiopian Christmas (Genna)', date: '2026-01-07', description: 'Celebration of the Nativity of Jesus Christ' },
  { id: 'hol-02', name: 'Epiphany (Timkat)', date: '2026-01-19', description: 'Baptism of Jesus in the Jordan River' },
  { id: 'hol-03', name: 'Victory of Adwa', date: '2026-03-02', description: 'Commemoration of the Battle of Adwa victory in 1896' },
  { id: 'hol-04', name: 'Eid al-Fitr', date: '2026-03-20', description: 'Islamic holiday marking the end of Ramadan' },
  { id: 'hol-05', name: 'Ethiopian Good Friday (Siklet)', date: '2026-04-10', description: 'Orthodox Good Friday crucifixion commemoration' },
  { id: 'hol-06', name: 'Ethiopian Easter (Fasika)', date: '2026-04-12', description: 'Resurrection of Jesus Christ' },
  { id: 'hol-07', name: 'Patriots Victory Day', date: '2026-05-05', description: 'Liberation of Addis Ababa and patriotic resistance' },
  { id: 'hol-08', name: 'Eid al-Adha', date: '2026-05-27', description: 'Islamic Feast of Sacrifice' },
  { id: 'hol-09', name: 'Ethiopian New Year (Enkutatash)', date: '2026-09-11', description: 'New Year Day in the Ethiopian calendar (Meskerem 1)' },
  { id: 'hol-10', name: 'Finding of the True Cross (Meskel)', date: '2026-09-27', description: 'Commemoration of discovery of the True Cross' },
  { id: 'hol-11', name: 'The Prophet Birthday (Mawlid)', date: '2026-08-26', description: 'Birth of the Prophet Muhammad' },
];

// No demo attendance records - Populated by daily employee transactions
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

// No demo leave records - Created by verified staff leave requests
export const INITIAL_LEAVES: LeaveRecord[] = [];

// No demo activity logs - Generated by real user operations
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];

// Known historical demo record IDs to permanently purge from Firestore if previously seeded
export const DEMO_RECORD_IDS = {
  employees: ['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-005', 'emp-006', 'emp-007', 'emp-008', 'emp-009'],
  departments: ['dept-001', 'dept-002', 'dept-003', 'dept-004', 'dept-005', 'dept-006', 'dept-007', 'dept-008'],
  attendance: ['att-001', 'att-002', 'att-003', 'att-004', 'att-005', 'att-006', 'att-007', 'att-008', 'att-009', 'att-010'],
  leaves: ['lv-001', 'lv-002', 'lv-003', 'lv-004', 'lv-005'],
  users: ['usr-admin-special', 'usr-001', 'usr-002', 'usr-003', 'usr-004', 'usr-005', 'usr-006'],
  activityLogs: ['log-001', 'log-002', 'log-003', 'log-004', 'log-005', 'log-006'],
};
