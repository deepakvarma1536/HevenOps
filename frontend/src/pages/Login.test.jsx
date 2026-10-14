import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ login }),
}));

describe('staff login form', () => {
  beforeEach(() => login.mockReset());

  it('submits credentials and announces an authentication error accessibly', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ success: false, error: 'Invalid email or password' });
    render(<MemoryRouter><Login /></MemoryRouter>);

    await user.type(screen.getByLabelText('Email Address'), 'owner@example.test');
    await user.type(screen.getByLabelText('Password'), 'invalid-password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(login).toHaveBeenCalledWith('owner@example.test', 'invalid-password');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('aria-invalid', 'true');
  });
});
