import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within Select");
  }
  return context;
}

interface SelectProperties {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  defaultValue?: string;
  disabled?: boolean;
}

export function Select({ value: controlledValue, onValueChange, children, defaultValue, disabled }: SelectProperties) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const [open, setOpen] = React.useState(false);

  const value = controlledValue === undefined ? internalValue : controlledValue;
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen, disabled }}>
      {children}
    </SelectContext.Provider>
  );
}

interface SelectTriggerProperties {
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
  id?: string;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProperties>(
  ({ children: _children, className, placeholder, id }, reference) => {
    const { value, open, setOpen, disabled } = useSelectContext();

    return (
      <button
        ref={reference}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-950 dark:focus:ring-gray-300",
          className
        )}
      >
        <span>{value || placeholder || "Select..."}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  }
);

SelectTrigger.displayName = "SelectTrigger";

interface SelectValueProperties {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProperties) {
  const { value } = useSelectContext();
  return <span>{value || placeholder || "Select..."}</span>;
}

interface SelectContentProperties {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className }: SelectContentProperties) {
  const { open, setOpen } = useSelectContext();
  const contentReference = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentReference.current && !contentReference.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={contentReference}
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SelectItemProperties {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function SelectItem({ value, children, className }: SelectItemProperties) {
  const { value: selectedValue, onValueChange } = useSelectContext();
  const isSelected = selectedValue === value;

  return (
    <div
      onClick={() => onValueChange(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-gray-100 dark:bg-gray-700 font-medium",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SelectGroupProperties {
  children: React.ReactNode;
}

export function SelectGroup({ children }: SelectGroupProperties) {
  return <div className="p-1">{children}</div>;
}

interface SelectLabelProperties {
  children: React.ReactNode;
  className?: string;
}

export function SelectLabel({ children, className }: SelectLabelProperties) {
  return (
    <div className={cn("py-1.5 px-2 text-sm font-semibold text-gray-900 dark:text-gray-100", className)}>
      {children}
    </div>
  );
}
