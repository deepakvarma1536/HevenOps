import { staffApi } from './client';

async function getAll(path, params = {}, signal) {
  const result = [];
  let page = 1;
  while (true) {
    const response = await staffApi.get(path, { params: { ...params, page, limit: 100 }, signal });
    const payload = response.data;
    if (!Array.isArray(payload?.data) || !payload.pagination) {
      throw new Error(`Unexpected list response from ${path}.`);
    }
    result.push(...payload.data);
    if (page >= payload.pagination.totalPages) break;
    page += 1;
  }
  return result;
}

function formatRentMonth(value) {
  const [year, month] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || month < 1 || month > 12) {
    throw new Error('Unexpected rent month returned by the API.');
  }
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export async function loadProperties(signal) {
  return getAll('/properties', {}, signal);
}

export async function loadFloors(signal) {
  const properties = await getAll('/properties', {}, signal);
  const rows = await Promise.all(properties.map(async (property) => {
    const floors = await getAll('/floors', { propertyId: property.id }, signal);
    return floors.map((floor) => ({
      ...floor,
      propertyId: property.id,
      propertyName: property.name,
    }));
  }));
  return { properties, floors: rows.flat() };
}

export async function loadRooms(signal) {
  const { properties, floors } = await loadFloors(signal);
  const rows = await Promise.all(floors.map(async (floor) => {
    const rooms = await getAll('/rooms', { floorId: floor.id }, signal);
    return rooms.map((room) => ({
      ...room,
      roomNumber: room.room_number,
      propertyId: floor.propertyId,
      propertyName: floor.propertyName,
      floor: floor.name,
      floorId: floor.id,
    }));
  }));
  return { properties, floors, rooms: rows.flat() };
}

export async function loadBeds(signal) {
  const { properties, floors, rooms } = await loadRooms(signal);
  const rows = await Promise.all(rooms.map(async (room) => {
    const beds = await getAll('/beds', { roomId: room.id }, signal);
    return beds.map((bed) => ({
      ...bed,
      bedNumber: bed.bed_number,
      roomNumber: room.roomNumber,
      roomId: room.id,
      propertyId: room.propertyId,
      propertyName: room.propertyName,
      floor: room.floor,
      floorId: room.floorId,
      status: ({ VACANT: 'Vacant', OCCUPIED: 'Occupied', MAINTENANCE: 'Maintenance' })[bed.status] || bed.status,
    }));
  }));
  return { properties, floors, rooms, beds: rows.flat() };
}

export async function loadTenants(signal) {
  return getAll('/tenants', {}, signal);
}

export async function loadStays(signal) {
  const rows = await getAll('/stays', {}, signal);
  return rows.map((stay) => ({
    ...stay,
    propertyId: stay.property_id,
    status: stay.status === 'ACTIVE' ? 'Active' : 'Checked out',
  }));
}

export async function loadStayOptions(signal) {
  const [tenants, { beds, properties }] = await Promise.all([loadTenants(signal), loadBeds(signal)]);
  return { tenants, beds, properties };
}

export async function loadRentDues(signal) {
  const [stays, properties] = await Promise.all([loadStays(signal), loadProperties(signal)]);
  const rows = await Promise.all(stays.map(async (stay) => {
    const dues = await getAll(`/stays/${stay.id}/rent-dues`, {}, signal);
    return dues.map((due) => ({
      ...due,
      tenant: stay.tenant_name,
      room: `${stay.room_number}${stay.bed_number ? ` • ${stay.bed_number}` : ''}`,
      property: stay.property_name,
      propertyId: stay.propertyId,
      phone: stay.tenant_phone,
      roomNumber: stay.room_number,
      dueMonth: formatRentMonth(due.due_month),
      amount: Number(due.amount_paise) / 100,
      amountPaid: Number(due.amount_paid_paise) / 100,
      remainingAmount: Number(due.amount_remaining_paise) / 100,
      dueDate: due.due_date,
      status: ({ DUE: 'Due', PARTIALLY_PAID: 'Partial', PAID: 'Paid', OVERDUE: 'Overdue' })[due.status] || due.status,
      stayId: stay.id,
    }));
  }));
  return { properties, stays, dues: rows.flat() };
}

export async function loadPayments(signal) {
  const { properties, stays, dues } = await loadRentDues(signal);
  const rows = await Promise.all(dues.map(async (due) => {
    const payments = await getAll('/payments', { rentDueId: due.id }, signal);
    return payments.map((payment) => ({
      ...payment,
      tenant: due.tenant,
      rentMonth: due.dueMonth,
      amount: Number(payment.amount_paise) / 100,
      property: due.property,
      propertyId: due.propertyId,
      netAmount: (Number(payment.amount_paise) - Number(payment.reversed_amount_paise || 0)) / 100,
      status: Number(payment.reversed_amount_paise || 0) === 0 ? 'Successful' : Number(payment.reversed_amount_paise) >= Number(payment.amount_paise) ? 'Reversed' : 'Partially reversed',
    }));
  }));
  return { properties, stays, dues, payments: rows.flat() };
}

export function loadSpends(signal) {
  return getAll('/spends', { sortOrder: 'desc' }, signal);
}

export async function loadTenantDirectory(signal, showRent = true) {
  const [properties, tenants, { stays, dues }] = await Promise.all([
    loadProperties(signal), loadTenants(signal), showRent ? loadRentDues(signal) : loadStays(signal).then((stays) => ({ stays, dues: [] })),
  ]);
  return {
    properties,
    tenants: tenants.map((tenant) => {
      const stay = stays.find((row) => String(row.tenant_id) === String(tenant.id) && row.status === 'Active');
      const propertyId = stay?.propertyId ?? tenant.property_id;
      const rentStatuses = dues.filter((row) => String(row.stayId) === String(stay?.id)).map((row) => row.status);
      const status = ['Overdue', 'Partial', 'Due', 'Paid'].find((status) => rentStatuses.includes(status));
      return { ...tenant, stay, propertyId, property: properties.find((row) => row.id === propertyId)?.name, status };
    }),
  };
}

export async function loadBedDirectory(signal) {
  const [inventory, stays] = await Promise.all([loadBeds(signal), loadStays(signal)]);
  const active = new Map(stays.filter((stay) => stay.status === 'Active').map((stay) => [String(stay.bed_id), stay]));
  return { ...inventory, beds: inventory.beds.map((bed) => ({ ...bed, stay: active.get(String(bed.id)) })) };
}
