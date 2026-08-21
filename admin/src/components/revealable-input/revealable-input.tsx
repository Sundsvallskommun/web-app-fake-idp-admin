import { Input } from '@components/ui/input';
import { cn } from '@utils/cn';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import * as React from 'react';

type RevealableInputProps = Omit<React.ComponentPropsWithoutRef<typeof Input>, 'type'> & {
  revealLabel: string;
  concealLabel: string;
  loadValue?: () => Promise<void>;
};

/**
 * Inmatningsfält med öga för att visa/dölja känsliga testvärden. Ett värde kan
 * hämtas först vid det första reveal-klicket, så maskerade API-svar förblir den
 * normala vägen.
 */
export const RevealableInput = React.forwardRef<HTMLInputElement, RevealableInputProps>(
  ({ className, revealLabel, concealLabel, loadValue, ...props }, ref) => {
    const [revealed, setRevealed] = React.useState(false);
    const [loaded, setLoaded] = React.useState(loadValue === undefined);
    const [loading, setLoading] = React.useState(false);
    const label = revealed ? concealLabel : revealLabel;

    const toggleReveal = async () => {
      if (revealed) {
        setRevealed(false);
        return;
      }

      if (!loaded && loadValue) {
        setLoading(true);
        try {
          await loadValue();
          setLoaded(true);
        } catch {
          return;
        } finally {
          setLoading(false);
        }
      }

      setRevealed(true);
    };

    return (
      <div className="relative">
        <Input ref={ref} type={revealed ? 'text' : 'password'} className={cn('pr-9', className)} {...props} />
        <button
          type="button"
          onClick={toggleReveal}
          disabled={loading}
          aria-label={label}
          aria-pressed={revealed}
          title={label}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
        >
          {loading ?
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          : revealed ?
            <EyeOff className="size-4" aria-hidden="true" />
          : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    );
  }
);

RevealableInput.displayName = 'RevealableInput';
