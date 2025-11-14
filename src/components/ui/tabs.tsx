import * as React from "react";
import { cn } from "../../lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within Tabs");
  }
  return context;
}

interface TabsProperties {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value: controlledValue, onValueChange, defaultValue, children, className }: TabsProperties) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");

  const value = controlledValue === undefined ? internalValue : controlledValue;
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProperties {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProperties) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400",
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProperties {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({ value: triggerValue, children, className, disabled }: TabsTriggerProperties) {
  const { value, onValueChange } = useTabsContext();
  const isActive = value === triggerValue;

  return (
    <button
      type="button"
      onClick={() => !disabled && onValueChange(triggerValue)}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
          : "hover:bg-gray-200 dark:hover:bg-gray-700",
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProperties {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value: contentValue, children, className }: TabsContentProperties) {
  const { value } = useTabsContext();

  if (value !== contentValue) return null;

  return (
    <div
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </div>
  );
}
