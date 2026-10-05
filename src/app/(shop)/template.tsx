"use client";

import { useEffect, useState } from "react";

// Set after the first page has hydrated: the very first load is shown as soon
// as it is painted (no fade, nothing delays the main content), later
// navigations fade the new page in.
let navigated = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const [reveal] = useState(() => navigated);
  useEffect(() => {
    navigated = true;
  }, []);
  return <div className={reveal ? "page-reveal" : undefined}>{children}</div>;
}
