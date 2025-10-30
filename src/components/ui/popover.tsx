import * as React from "react";
import { cn } from "../../lib/utils";

interface PopoverContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined);

function usePopoverContext() {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error("Popover components must be used within Popover");
  }
  return context;
}

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Popover({ open: controlledOpen, onOpenChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <PopoverContext.Provider value={{ open, onOpenChange: handleOpenChange, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ children, asChild, className }, ref) => {
    const { open, onOpenChange, triggerRef } = usePopoverContext();

    const handleClick = () => {
      onOpenChange(!open);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...children.props,
        ref: ref || triggerRef,
        onClick: (e: React.MouseEvent) => {
          handleClick();
          children.props.onClick?.(e);
        },
      } as any);
    }

    return (
      <button
        type="button"
        ref={ref || triggerRef}
        onClick={handleClick}
        className={cn("inline-flex items-center justify-center", className)}
      >
        {children}
      </button>
    );
  }
);

PopoverTrigger.displayName = "PopoverTrigger";

interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export function PopoverContent({ children, className, align = "center", sideOffset = 4 }: PopoverContentProps) {
  const { open, onOpenChange, triggerRef } = usePopoverContext();
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onOpenChange, triggerRef]);

  if (!open) return null;

  const alignmentClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div
      ref={contentRef}
      style={{ marginTop: `${sideOffset}px` }}
      className={cn(
        "absolute z-50 w-72 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg outline-none animate-fade-in",
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}
