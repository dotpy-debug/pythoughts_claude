import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CheckboxProperties extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProperties>(
  ({ className, checked, onCheckedChange, onChange, ...properties }, reference) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="relative inline-flex">
        <input
          type="checkbox"
          ref={reference}
          checked={checked}
          onChange={handleChange}
          className="peer sr-only"
          {...properties}
        />
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded-sm border border-gray-300 dark:border-gray-600 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "peer-checked:bg-gray-900 peer-checked:border-gray-900 dark:peer-checked:bg-gray-50 dark:peer-checked:border-gray-50",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-gray-950 peer-focus-visible:ring-offset-2",
            "transition-colors",
            className
          )}
        >
          {checked && (
            <Check className="h-3 w-3 text-white dark:text-gray-900 m-auto" strokeWidth={3} />
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
