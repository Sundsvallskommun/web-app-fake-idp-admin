import { ReactNode } from 'react';

interface MainProps {
  children: ReactNode;
}

export default function Main({ children }: MainProps) {
  return (
    // tabIndex={-1}: skip-länken gör focus() på elementet, vilket är en no-op
    // utan tabIndex — fokus blev annars kvar i navigationen (WCAG 2.4.1).
    <main className="min-h-full h-auto w-full flex flex-col pb-8" id="content" tabIndex={-1}>
      {children}
    </main>
  );
}
