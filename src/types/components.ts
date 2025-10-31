/**
 * Component Prop Type Definitions
 *
 * Type-safe prop interfaces for React components, events, and UI elements.
 */

import type { ReactNode } from 'react';

/**
 * Base component props
 */
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Form field change event
 */
export type FormFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

/**
 * Form submit event
 */
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>;

/**
 * Mouse click event
 */
export type MouseClickEvent = React.MouseEvent<HTMLElement>;

/**
 * Keyboard event
 */
export type KeyboardEvent = React.KeyboardEvent<HTMLElement>;

/**
 * Drag event
 */
export type DragEvent = React.DragEvent<HTMLElement>;

/**
 * File input change event with files
 */
export interface FileInputChangeEvent extends React.ChangeEvent<HTMLInputElement> {
  target: HTMLInputElement & {
    files: FileList;
  };
}

/**
 * Toast notification type
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

/**
 * Modal props
 */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Dialog action button
 */
export interface DialogAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Table column definition
 */
export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => ReactNode;
}

/**
 * Table sorting state
 */
export interface TableSortState {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Search/filter state
 */
export interface FilterState {
  searchQuery: string;
  filters: Record<string, string | string[] | number | boolean>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Select option
 */
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  icon?: ReactNode;
}

/**
 * Tab item
 */
export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  disabled?: boolean;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  isCurrentPage?: boolean;
}

/**
 * Menu item
 */
export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
  children?: MenuItem[];
}

/**
 * Chart data point (generic)
 */
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

/**
 * Loading state
 */
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  data: unknown;
}

/**
 * Async data state with type safety
 */
export interface AsyncDataState<T> {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
}

/**
 * Form validation error
 */
export interface FormValidationError {
  field: string;
  message: string;
}

/**
 * Form state
 */
export interface FormState<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Dropdown position
 */
export type DropdownPosition = 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

/**
 * Color scheme
 */
export type ColorScheme = 'light' | 'dark' | 'system';

/**
 * Size variant
 */
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Button variant
 */
export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';

/**
 * File upload status
 */
export interface FileUploadStatus {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

/**
 * Infinite scroll state
 */
export interface InfiniteScrollState<T> {
  items: T[];
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  page: number;
}

/**
 * Virtualized list props
 */
export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
}

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Keyboard shortcut
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}
