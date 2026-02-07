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
      className={`${className} inline-flex items-center justify-center rounded-xl !bg-emerald-600 !text-white px-4 py-2 font-medium shadow-sm transition hover:!bg-emerald-500 disabled:opacity-60`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
