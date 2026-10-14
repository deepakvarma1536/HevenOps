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
    status: stay.status === 'ACTIVE' ? 'Active' : 'Checked out',
  }));
}

export async function loadStayOptions(signal) {
  const [tenants, { beds }] = await Promise.all([loadTenants(signal), loadBeds(signal)]);
  return { tenants, beds };
}

export async function loadRentDues(signal) {
  const stays = await loadStays(signal);
  const rows = await Promise.all(stays.map(async (stay) => {
    const dues = await getAll(`/stays/${stay.id}/rent-dues`, {}, signal);
    return Promise.all(dues.map(async (due) => {
      const summary = (await staffApi.get(`/rent-dues/${due.id}/summary`, { signal })).data;
      return {
        ...due,
        tenant: stay.tenant_name,
        room: `${stay.room_number}${stay.bed_number ? ` • ${stay.bed_number}` : ''}`,
        property: stay.property_name,
        dueMonth: formatRentMonth(due.due_month),
        amount: Number(due.amount_paise) / 100,
        amountPaid: Number(summary.amount_paid_paise) / 100,
        remainingAmount: Number(summary.amount_remaining_paise) / 100,
        dueDate: due.due_date,
        status: ({ DUE: 'Due', PARTIALLY_PAID: 'Partial', PAID: 'Paid', OVERDUE: 'Overdue' })[summary.status] || summary.status,
        stayId: stay.id,
      };
    }));
  }));
  return { stays, dues: rows.flat() };
}

export async function loadPayments(signal) {
  const { stays, dues } = await loadRentDues(signal);
  const rows = await Promise.all(dues.map(async (due) => {
    const payments = await getAll('/payments', { rentDueId: due.id }, signal);
    return payments.map((payment) => ({
      ...payment,
      tenant: due.tenant,
      rentMonth: due.dueMonth,
      amount: Number(payment.amount_paise) / 100,
      property: due.property,
    }));
  }));
  return { stays, dues, payments: rows.flat() };
}
