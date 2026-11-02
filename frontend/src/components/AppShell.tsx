'use client';

import React from 'react';

/**
 * AppShell: Clean root shell component.
 * Layout headers and footers are managed authoritatively by individual route pages
 * (e.g. AppHeader / AppFooter in Warm Architectural Modernism design system).
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
