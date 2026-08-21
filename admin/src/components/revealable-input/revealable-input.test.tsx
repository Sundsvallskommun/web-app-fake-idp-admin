import { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RevealableInput } from './revealable-input';

describe('RevealableInput', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('loads a sensitive value only on the first reveal', async () => {
    const loadValue = vi.fn().mockResolvedValue('199001011234');

    const Harness = () => {
      const [value, setValue] = useState('••••••••••••');
      return (
        <RevealableInput
          value={value}
          readOnly
          revealLabel="Visa personnummer"
          concealLabel="Dölj personnummer"
          loadValue={async () => setValue(await loadValue())}
        />
      );
    };

    await act(async () => root.render(<Harness />));
    const input = container.querySelector('input');
    const button = container.querySelector('button');
    expect(input?.type).toBe('password');

    await act(async () => button?.click());
    expect(loadValue).toHaveBeenCalledTimes(1);
    expect(input?.value).toBe('199001011234');
    expect(input?.type).toBe('text');
    expect(button?.getAttribute('aria-label')).toBe('Dölj personnummer');

    await act(async () => button?.click());
    expect(input?.type).toBe('password');

    await act(async () => button?.click());
    expect(input?.type).toBe('text');
    expect(loadValue).toHaveBeenCalledTimes(1);
  });

  it('remains concealed when loading the value fails', async () => {
    const loadValue = vi.fn().mockRejectedValue(new Error('network error'));

    await act(async () =>
      root.render(
        <RevealableInput
          defaultValue="••••••••••••"
          revealLabel="Visa personnummer"
          concealLabel="Dölj personnummer"
          loadValue={loadValue}
        />
      )
    );
    const input = container.querySelector('input');

    await act(async () => container.querySelector('button')?.click());

    expect(input?.type).toBe('password');
    expect(loadValue).toHaveBeenCalledTimes(1);
  });
});
