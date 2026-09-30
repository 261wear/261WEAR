"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./Spinner";

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  pending?: boolean;
  pendingLabel?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

// Button with a built-in pending state: disabled (no double submit), spinner in
// place of the icon, optional pending label, and aria-busy for screen readers.
export function Button({ pending = false, pendingLabel, icon, children, disabled, className = "btn-dark", ...rest }: Props) {
  return (
    <button {...rest} disabled={disabled || pending} aria-busy={pending || undefined} className={className}>
      {pending ? <Spinner /> : icon}
      <span>{pending && pendingLabel ? pendingLabel : children}</span>
    </button>
  );
}

// For plain <form action={serverAction}> forms: reads the pending state of the parent form.
export function SubmitButton(props: Omit<Props, "pending" | "type">) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" pending={pending} />;
}
