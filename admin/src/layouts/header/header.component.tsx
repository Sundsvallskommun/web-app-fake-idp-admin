import { cn } from '@utils/cn';

interface HeaderProps {
  className?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ className, children }) => {
  return (
    <header
      className={cn(
        // sk → Tailwind: mb-32→mb-8 (32px), gap-6→gap-1.5 (6px), border-b-1→border-b
        // (border-b-1 finns inte i vanilla Tailwind), pb-16→pb-4.
        // min-h (inte h): innehållet radbryts på smala skärmar och en fast höjd
        // får raderna att överlappa innehållet under.
        'mb-8 flex flex-col gap-1.5 border-b border-b-border pb-4 min-h-24 justify-center',
        className
      )}
    >
      {children}
    </header>
  );
};
