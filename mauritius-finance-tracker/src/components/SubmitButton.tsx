"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: string;
  pendingText?: string;
  className?: string;
};

export default function SubmitButton({
  children,
  pendingText = "Saving...",
  className = "",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-xl bg-slate-900 text-white py-2 font-medium disabled:opacity-60 ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
