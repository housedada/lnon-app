// lib/types.ts - Definizioni TypeScript per il gestionale

export type UserRole = 'superadmin' | 'admin' | 'dipendente';

export interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
}

export type JobStatus = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  clientId: string;
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
  approvedAt?: Date;
  approvedBy?: string;
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
