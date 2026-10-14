import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ApiResourcePage from './ApiResourcePage';

describe('ApiResourcePage', () => {
  it('loads and renders records, then creates a record and refreshes the list', async () => {
    const user = userEvent.setup();
    const loader = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'North House' }])
      .mockResolvedValueOnce([{ id: 1, name: 'North House' }, { id: 2, name: 'South House' }]);
    const createRecord = vi.fn().mockResolvedValue({});

    render(<ApiResourcePage
      title="Properties"
      description="Manage properties"
      loader={loader}
      columns={[{ key: 'name', label: 'Property' }]}
      fields={[{ name: 'name', label: 'Property name' }]}
      createRecord={createRecord}
    />);

    expect(await screen.findByRole('cell', { name: 'North House' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Property name'), 'South House');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(createRecord).toHaveBeenCalledWith({ name: 'South House' }, [{ id: 1, name: 'North House' }], null));
    expect(await screen.findByRole('cell', { name: 'South House' })).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('shows an error and retries the resource request', async () => {
    const user = userEvent.setup();
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('API unavailable'))
      .mockResolvedValueOnce([]);

    render(<ApiResourcePage
      title="Properties"
      description="Manage properties"
      loader={loader}
      columns={[{ key: 'name', label: 'Property' }]}
      fields={[]}
    />);

    expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No properties yet');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('blocks invalid numeric input before issuing a create request', async () => {
    const createRecord = vi.fn();
    render(<ApiResourcePage
      title="Payments"
      description="Record a payment"
      loader={async () => ({ payments: [] })}
      selectRows={(data) => data.payments}
      columns={[]}
      fields={[{ name: 'amount', label: 'Amount', type: 'number', min: 1 }]}
      createRecord={createRecord}
    />);

    await screen.findByRole('status');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Add payments record' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Amount must be between 1 and the maximum.');
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('reuses a payment idempotency key when retrying a failed create', async () => {
    const user = userEvent.setup();
    const loader = vi.fn().mockResolvedValue({ payments: [] });
    const createRecord = vi.fn()
      .mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockResolvedValueOnce({});
    vi.stubGlobal('crypto', { randomUUID: () => 'stable-payment-key' });

    render(<ApiResourcePage
      title="Payments"
      description="Record a payment"
      loader={loader}
      selectRows={(data) => data.payments}
      columns={[]}
      fields={[{ name: 'amount', label: 'Amount', type: 'number', min: 1 }]}
      createRecord={createRecord}
      requiresIdempotencyKey
    />);

    await screen.findByRole('status');
    await user.type(screen.getByLabelText('Amount'), '20');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(createRecord).toHaveBeenCalledTimes(2));
    expect(createRecord.mock.calls.map((call) => call[2])).toEqual(['stable-payment-key', 'stable-payment-key']);
  });
});
