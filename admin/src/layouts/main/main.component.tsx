import { ReactNode } from 'react';

interface MainProps {
  children: ReactNode;
}

export default function Main({ children }: MainProps) {
  return (
    <main className="min-h-full h-auto w-full flex flex-col pb-8" id="content">
      {children}
    </main>
  );
}
