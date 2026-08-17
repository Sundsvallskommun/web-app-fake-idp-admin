import Head from 'next/head';
import { ReactNode } from 'react';

interface EmptyLayoutProps {
  title: string;
  children: ReactNode;
}

export default function EmptyLayout({ title, children }: EmptyLayoutProps) {
  return (
    <div className="EmptyLayout bg-background text-foreground">
      <Head>
        <title>{title}</title>
      </Head>

      <div className="min-h-screen">{children}</div>
    </div>
  );
}
