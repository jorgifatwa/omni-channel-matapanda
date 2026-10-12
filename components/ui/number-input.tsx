"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | string | undefined | null;
  onChangeValue?: (numericValue: number, rawString: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Formats a number or numeric string with Indonesian thousands separator (e.g. 500000 -> "500.000")
 */
export function formatWithSeparator(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  const digits = String(val).replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

/**
 * Extracts raw number from a formatted or unformatted string (e.g. "500.000" -> 500000)
 */
export function parseNumber(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  const digits = String(val).replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, onChangeValue, placeholder, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    const displayValue = React.useMemo(() => {
      return formatWithSeparator(value);
    }, [value]);

    const formattedPlaceholder = React.useMemo(() => {
      if (!placeholder) return undefined;
      // If placeholder is pure digits or starts with digits, format it with separators
      const digits = String(placeholder).replace(/\D/g, "");
      if (digits && /^\d+$/.test(placeholder)) {
        return formatWithSeparator(digits);
      }
      return placeholder;
    }, [placeholder]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        const el = e.currentTarget;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start !== null && start === end && start > 0) {
          if (el.value[start - 1] === ".") {
            e.preventDefault();
            const rawText = el.value.slice(0, start - 2) + el.value.slice(start);
            const rawWithoutCents = rawText.replace(/,\d{1,2}$/, "");
            const cleanDigits = rawWithoutCents.replace(/\D/g, "");
            const numericVal = cleanDigits ? Number(cleanDigits) : 0;
            const formatted = formatWithSeparator(cleanDigits);

            const digitsBeforeCursor = el.value.slice(0, start - 2).replace(/\D/g, "").length;
            let targetPos = 0;
            let digitsCount = 0;
            for (let i = 0; i < formatted.length; i++) {
              if (/\d/.test(formatted[i])) {
                digitsCount++;
              }
              if (digitsCount === digitsBeforeCursor) {
                targetPos = i + 1;
                break;
              }
            }
            if (digitsCount < digitsBeforeCursor) {
              targetPos = formatted.length;
            }

            if (onChangeValue) {
              onChangeValue(numericVal, cleanDigits);
            }

            if (onChange) {
              const syntheticEvent = {
                ...e,
                target: {
                  ...el,
                  value: cleanDigits,
                  name: el.name,
                },
                currentTarget: {
                  ...el,
                  value: cleanDigits,
                  name: el.name,
                },
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent);
            }

            requestAnimationFrame(() => {
              if (inputRef.current) {
                inputRef.current.setSelectionRange(targetPos, targetPos);
              }
            });
            return;
          }
        }
      }
      props.onKeyDown?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const rawText = el.value;
      const cursorPos = el.selectionStart || 0;

      // Count digits before the cursor in the unformatted text
      const digitsBeforeCursor = rawText.slice(0, cursorPos).replace(/\D/g, "").length;

      const rawWithoutCents = rawText.replace(/,\d{1,2}$/, "");
      const cleanDigits = rawWithoutCents.replace(/\D/g, "");
      const numericVal = cleanDigits ? Number(cleanDigits) : 0;

      // Format clean digits
      const formatted = formatWithSeparator(cleanDigits);

      // Calculate new cursor position in the formatted string
      let targetPos = 0;
      let digitsCount = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitsCount++;
        }
        if (digitsCount === digitsBeforeCursor) {
          targetPos = i + 1;
          break;
        }
      }
      if (digitsCount < digitsBeforeCursor) {
        targetPos = formatted.length;
      }

      // Notify callback with numeric value and raw string
      if (onChangeValue) {
        onChangeValue(numericVal, cleanDigits);
      }

      // Also trigger standard onChange with clean digits as e.target.value
      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...el,
            value: cleanDigits,
            name: el.name,
          },
          currentTarget: {
            ...el,
            value: cleanDigits,
            name: el.name,
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }

      // Preserve cursor position smoothly
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(targetPos, targetPos);
        }
      });
    };

    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={formattedPlaceholder}
        className={cn(
          "flex h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";
