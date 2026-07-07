"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that reflects the enclosing form's pending state:
 * disables itself during submission (prevents double-taps) and can swap
 * its label for a "pending" message.
 */
export function SubmitButton({
  children,
  pendingText,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={className}>
      {pending ? pendingText ?? children : children}
    </button>
  );
}
