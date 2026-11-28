const dateFormat = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const currencyFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : '—';
}

export function money(value) {
  return value == null ? '—' : currencyFormat.format(value);
}

export function propertyOptions(data) {
  return data?.properties?.map((item) => ({ value: String(item.id), label: item.name })) || [];
}

export const propertyFilter = {
  key: 'propertyId',
  label: 'Property',
  all: 'All Properties',
  options: propertyOptions,
};

export const statusFilter = { key: 'status', label: 'Status', all: 'All Statuses' };

export const floorOptions = (data) => data?.floors.map((floor) => ({
  value: floor.id,
  label: `${floor.name} · ${floor.propertyName}`,
})) || [];
