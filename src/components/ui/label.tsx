import * as React from "react";
import { cn } from "../../lib/utils";

export interface LabelProperties extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProperties>(
  ({ className, ...properties }, reference) => {
    return (
      <label
        ref={reference}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...properties}
      />
    );
  }
);

Label.displayName = "Label";
