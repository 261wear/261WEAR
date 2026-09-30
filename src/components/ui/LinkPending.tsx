"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "./Spinner";

// Inline hint for a <Link> whose destination has no instant loading state
// (e.g. same page, new search params). Fixed size so nothing shifts.
export function LinkPending() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden="true" className={`inline-flex h-3 w-3 align-middle transition-opacity ${pending ? "opacity-100" : "opacity-0"}`}>
      <Spinner className="h-3 w-3" />
    </span>
  );
}
