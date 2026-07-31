// lib/types.ts - Definizioni TypeScript per il gestionale

export type UserRole = 'superadmin' | 'admin' | 'dipendente';

export interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  role: UserRole;
  isActive: boolean;
  color?: string;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export const USER_TAG_COLORS = [
  '#F8B4B4',
  '#F8CBAD',
  '#FCE38A',
  '#D4F0C0',
  '#A8E6CF',
  '#B5DEFF',
  '#C3B1E1',
  '#E0BBE4',
  '#FFC9DE',
  '#FFDAC1',
  '#C7CEEA',
  '#B8E0D2',
  '#FFB4A2',
  '#A0D2EB',
  '#CDEAC0',
  '#F1C0E8',
] as const;

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxId?: string; // Partita IVA
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  internalCode?: string;
  province?: string;
  addressNotes?: string;
  contactPerson?: string;
  fiscalCode?: string;
  pecEmail?: string;
  iban?: string;
  sdiCode?: string;
  defaultVatRate?: number;
  paymentTerms?: string;
  defaultPaymentMethod?: string;
  fax?: string;
  shippingAddress?: string;
  defaultDiscount?: number;
  letterOfIntentEnabled?: boolean;
  receiptProtocol?: string;
  telematicReceiptDate?: Date;
  ficId?: number;
  ficSyncStatus: FicSyncStatus;
  ficLastSyncedAt?: Date;
}

export type FicSyncStatus = 'not_synced' | 'synced' | 'orphaned';

export interface FicConnection {
  id: string;
  ficCompanyId: number;
  ficCompanyName?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  webhookSubscriptionId?: string;
  connectedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Rappresentazione minima di un cliente Fatture in Cloud, per ricerca/collegamento
export interface FicClientSummary {
  id: number;
  name: string;
  vatNumber?: string;
  taxCode?: string;
  email?: string;
}

export interface Product {
  id: string;
  name: string;
  code?: string;
  description?: string;
  category?: string;
  measure?: string;
  netPrice?: number;
  grossPrice?: number;
  defaultVatRate?: number;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  ficId?: number;
  ficSyncStatus: FicSyncStatus;
  ficLastSyncedAt?: Date;
}

// Rappresentazione minima di un prodotto Fatture in Cloud, per ricerca/collegamento
export interface FicProductSummary {
  id: number;
  name: string;
  code?: string;
}

export type ContractStatus = 'attivo' | 'disattivo' | 'da_definire';

export interface Contract {
  id: string;
  clientId?: string;
  clientNameRaw: string;
  site?: string;
  status: ContractStatus;
  billingMonth?: string;
  maintenanceWpAmount?: number;
  hostingAmount?: number;
  analyticsGdprAmount?: number;
  cookieAmount?: number;
  totalAmount?: number;
  serviceDescription?: string;
  package?: string;
  notes?: string;
  provider?: string;
  providerPlan?: string;
  providerExpiryDate?: Date;
  providerCost?: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Popolato solo dalla lista, se collegato a un cliente
  clientName?: string;
}

export type JobStatus = 'preventivato' | 'pre_approvato' | 'in_corso' | 'completato' | 'fatturato' | 'annullato';

export type JobCategory = 'standard' | 'web' | 'hourly';

export interface Job {
  id: string;
  clientId?: string;
  clientNameRaw?: string;
  contractIds?: string[];
  title: string;
  description?: string;
  status: JobStatus;
  estimatedBudget?: number;
  actualBudget?: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  archivedAt?: Date;
  productIds?: string[];
  // Anno di competenza economica del lavoro, per la Overview Lavori
  fiscalYear: number;
  // Generazione automatica (es. da un contratto a conteggio orario)
  isSystemGenerated?: boolean;
  systemSource?: 'hourly_contract';
  // Spesa fornitori/sottofornitori sostenuta per questo lavoro (importo singolo)
  supplierCost?: number;
  // Numero fattura corrispondente al lavoro (inseribile manualmente)
  invoiceNumber?: string;
  // Popolati solo dalla lista/dettaglio, se collegati
  clientName?: string;
  contractLabels?: string[];
  assignedToName?: string;
}

export interface Project {
  id: string;
  jobId?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  completedAt?: Date;
  // Generazione automatica (es. da un contratto a conteggio orario, o dal contenitore appunti personali)
  isSystemGenerated?: boolean;
  systemSource?: 'hourly_contract' | 'personal_notes';
  isDemo?: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Popolati solo in lettura, se collegati
  jobTitle?: string;
  assignedToName?: string;
  productIds?: string[];
}

export interface FixedExpenseCategory {
  id: string;
  label: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface FixedExpenseEntry {
  id: string;
  categoryId: string;
  fiscalYear: number;
  amount: number;
  isActive: boolean;
  updatedBy: string;
  updatedAt: Date;
  // Popolato solo in lettura, se collegato
  categoryLabel?: string;
}

export type HourlyRateType = 'standard' | 'cheap' | 'custom';
// Automatico: 'in_corso' quando c'è almeno un task assegnato/non completato,
// 'riposo' quando il contratto viene messo a riposo (ultimo task completato
// via pulsante dedicato). Non impostabile manualmente da form.
export type HourlyContractStatus = 'in_corso' | 'riposo';
export type HourlyWorkEntryStatus = 'assegnata' | 'completata';

export interface HourlyContract {
  id: string;
  clientId: string;
  // Nome informale di riferimento (es. nome del sito/progetto), quando
  // clientId è un intermediario di fatturazione (es. Dunter S.R.L.) e non
  // il cliente nominale a cui il lavoro si riferisce davvero. Mostrato tra
  // parentesi accanto al nome del cliente reale nel titolo del Project.
  referenceName?: string;
  rateType: HourlyRateType;
  customHourlyRate?: number;
  status: HourlyContractStatus;
  jobId?: string;
  projectId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Popolati solo in lettura (lista/dettaglio)
  clientName?: string;
  effectiveHourlyRate?: number;
  entriesCount?: number;
  lastEntryDate?: Date;
  totalAmount?: number;
}

export interface HourlyWorkEntry {
  id: string;
  hourlyContractId: string;
  projectTaskId?: string;
  platformReference?: string;
  description: string;
  hours: number;
  status: HourlyWorkEntryStatus;
  amount: number;
  // true = lavorazione storica che ha portato il contratto in riposo: resta
  // visibile ma non più cliccabile/modificabile
  locked: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Popolate solo in lettura, dal Task collegato (project_task_id)
  taskCreatedAt?: Date;
  taskCompletedAt?: Date;
}

export type ProjectTaskStatus = 'todo' | 'in_progress' | 'completed';
export type ProjectTaskKind = 'task' | 'note';

export interface ProjectTask {
  id: string;
  projectId: string;
  parentTaskId?: string;
  title: string;
  status: ProjectTaskStatus;
  kind: ProjectTaskKind;
  position: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Valorizzato automaticamente quando status passa a completed, azzerato se riaperto
  completedAt?: Date;
  deletedAt?: Date;
  // Popolati solo in lettura: un task può essere condiviso tra più membri
  assignedToIds: string[];
  assignedToUsers: { id: string; name: string; color?: string }[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  assignedAt?: Date;
  dueDate?: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  jobId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'dipendente';
  invitedBy: string;
  used: boolean;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  entityType: 'client' | 'job' | 'task' | 'invoice' | 'users';
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth Session
export interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    image?: string;
  };
  expires: Date;
}

// Permessi per ruolo
export interface PermissionMatrix {
  [key: string]: {
    [resource: string]: string[]; // ['read', 'create', 'update', 'delete']
  };
}
