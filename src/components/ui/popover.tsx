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

interface PopoverProperties {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Popover({ open: controlledOpen, onOpenChange, children }: PopoverProperties) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerReference = React.useRef<HTMLButtonElement>(null);

  const open = controlledOpen === undefined ? internalOpen : controlledOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <PopoverContext.Provider value={{ open, onOpenChange: handleOpenChange, triggerRef: triggerReference }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProperties {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProperties>(
  ({ children, asChild, className }, reference) => {
    const { open, onOpenChange, triggerRef } = usePopoverContext();

    const handleClick = () => {
      onOpenChange(!open);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...children.props,
        ref: reference || triggerRef,
        onClick: (e: React.MouseEvent) => {
          handleClick();
          children.props.onClick?.(e);
        },
      } as React.CSSProperties);
    }

    return (
      <button
        type="button"
        ref={reference || triggerRef}
        onClick={handleClick}
        className={cn("inline-flex items-center justify-center", className)}
      >
        {children}
      </button>
    );
  }
);

PopoverTrigger.displayName = "PopoverTrigger";

interface PopoverContentProperties {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export function PopoverContent({ children, className, align = "center", sideOffset = 4 }: PopoverContentProperties) {
  const { open, onOpenChange, triggerRef } = usePopoverContext();
  const contentReference = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentReference.current &&
        !contentReference.current.contains(event.target as Node) &&
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
      ref={contentReference}
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
