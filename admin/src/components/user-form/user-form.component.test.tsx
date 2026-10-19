import { renderToStaticMarkup } from 'react-dom/server';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { UserFormFields } from './user-form.component';
import { createEmptyUserForm, UserForm } from './user-form.model';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@utils/use-resource', () => ({
  useResource: () => ({ data: [], loaded: true, loading: false, error: false, refresh: vi.fn() }),
}));

const Form = ({ editing = false, requirePassword = false }: { editing?: boolean; requirePassword?: boolean }) => {
  const form = useForm<UserForm>({ defaultValues: { ...createEmptyUserForm(), requirePassword } });

  return (
    <UserFormFields
      control={form.control}
      register={form.register}
      resetField={form.resetField}
      revealCitizenIdentifier={editing ? async () => '199001011234' : undefined}
    />
  );
};

describe('UserFormFields', () => {
  it.each([false, true])('requires the password field only when the user flag is %s', (requirePassword) => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<Form requirePassword={requirePassword} />);
    expect(container.querySelector<HTMLInputElement>('#user-password')?.required).toBe(requirePassword);
    expect(container.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe(String(requirePassword));
  });

  it.each([
    ['create', false],
    ['edit', true],
  ])('does not render example values as placeholders in %s mode', (_mode, editing) => {
    const html = renderToStaticMarkup(<Form editing={editing} />);

    expect(html).not.toContain('placeholder=');
  });
});
