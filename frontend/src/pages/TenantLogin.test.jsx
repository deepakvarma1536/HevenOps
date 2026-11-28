import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TenantLogin from './TenantLogin';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../context/useTenantAuth', () => ({
  useTenantAuth: () => ({ login }),
}));

describe('tenant login form', () => {
  beforeEach(() => login.mockReset());

  it('reveals the password and submits the entered credentials', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ success: true });
    render(<TenantLogin />);

    await user.type(screen.getByLabelText('Email or Phone'), 'tenant@example.test');
    const password = screen.getByLabelText('Password');
    await user.type(password, 'tenant-password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));

    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(login).toHaveBeenCalledWith('tenant@example.test', 'tenant-password');
  });
});
