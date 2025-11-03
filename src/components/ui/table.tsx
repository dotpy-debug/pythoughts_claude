import * as React from "react";
import { cn } from "../../lib/utils";

interface TableProperties {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProperties) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProperties {
  children: React.ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProperties) {
  return (
    <thead className={cn("[&_tr]:border-b border-gray-200 dark:border-gray-700", className)}>
      {children}
    </thead>
  );
}

interface TableBodyProperties {
  children: React.ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProperties) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)}>
      {children}
    </tbody>
  );
}

interface TableFooterProperties {
  children: React.ReactNode;
  className?: string;
}

export function TableFooter({ children, className }: TableFooterProperties) {
  return (
    <tfoot className={cn("border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium", className)}>
      {children}
    </tfoot>
  );
}

interface TableRowProperties {
  children: React.ReactNode;
  className?: string;
}

export function TableRow({ children, className }: TableRowProperties) {
  return (
    <tr className={cn("border-b border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 data-[state=selected]:bg-gray-100 dark:data-[state=selected]:bg-gray-800", className)}>
      {children}
    </tr>
  );
}

interface TableHeadProperties {
  children: React.ReactNode;
  className?: string;
}

export function TableHead({ children, className }: TableHeadProperties) {
  return (
    <th className={cn("h-12 px-4 text-left align-middle font-medium text-gray-500 dark:text-gray-400 [&:has([role=checkbox])]:pr-0", className)}>
      {children}
    </th>
  );
}

interface TableCellProperties {
  children: React.ReactNode;
  className?: string;
}

export function TableCell({ children, className }: TableCellProperties) {
  return (
    <td className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}>
      {children}
    </td>
  );
}

interface TableCaptionProperties {
  children: React.ReactNode;
  className?: string;
}

export function TableCaption({ children, className }: TableCaptionProperties) {
  return (
    <caption className={cn("mt-4 text-sm text-gray-500 dark:text-gray-400", className)}>
      {children}
    </caption>
  );
}
