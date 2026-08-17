import { act, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const TestComponent = ({ timeToDone }: { timeToDone: number }) => {
  const [state, setState] = useState('Not done');

  useEffect(() => {
    const timer = setTimeout(() => {
      setState('Done');
    }, timeToDone);

    return () => clearTimeout(timer);
  }, [timeToDone]);

  return <div data-testid="state">{state}</div>;
};

afterEach(() => {
  vi.useRealTimers();
});

describe('Example component', () => {
  it('updates after the configured delay', async () => {
    vi.useFakeTimers();
    render(<TestComponent timeToDone={200} />);

    expect(screen.getByTestId('state')).toHaveTextContent('Not done');

    await act(() => vi.advanceTimersByTimeAsync(200));

    expect(screen.getByTestId('state')).toHaveTextContent('Done');
  });
});
