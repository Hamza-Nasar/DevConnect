import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, value, onChange, readOnly, ...props }, ref) => {
    // Check if value is provided and if onChange exists
    const hasValue = value !== undefined && value !== null;
    const hasOnChange = onChange !== undefined;
    
    // If value is provided without onChange, use defaultValue (uncontrolled input)
    // Otherwise, use value with onChange (controlled input) or make it readOnly
    const inputProps: any = {};
    
    if (hasValue) {
      if (hasOnChange) {
        // Controlled input with onChange
        inputProps.value = value == null ? "" : String(value);
        inputProps.onChange = onChange;
      } else if (readOnly) {
        // Read-only controlled input
        inputProps.value = value == null ? "" : String(value);
        inputProps.readOnly = true;
      } else {
        // Uncontrolled input - use defaultValue
        inputProps.defaultValue = value == null ? "" : String(value);
      }
    }
    
    // Apply readOnly if explicitly set
    if (readOnly) {
      inputProps.readOnly = true;
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500",
            readOnly && "cursor-default",
            className
          )}
          ref={ref}
          onChange={onChange}
          {...inputProps}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };





