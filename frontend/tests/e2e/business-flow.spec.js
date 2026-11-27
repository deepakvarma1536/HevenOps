import { expect, request as playwrightRequest, test } from '@playwright/test';

const apiUrl = (process.env.E2E_API_URL || 'http://127.0.0.1:3000/api').replace(/\/+$/, '');
const password = 'test-only-password-45';
const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

async function registerOrganization(request, label) {
  const email = `${label}-${unique}@example.test`;
  const response = await request.post(`${apiUrl}/auth/register`, {
    data: {
      name: `${label} Owner`,
      email,
      password,
      organizationName: `${label} Org ${unique}`,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return { email, token: (await response.json()).token };
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

test.beforeAll(async () => {
  const healthUrl = new URL(apiUrl);
  healthUrl.pathname = healthUrl.pathname.replace(/\/api\/?$/, '/health');
  const apiContext = await playwrightRequest.newContext();
  try {
    const response = await apiContext.get(healthUrl.toString());
    expect(response.ok(), `API health check failed at ${healthUrl}`).toBeTruthy();
  } finally {
    await apiContext.dispose();
  }
});

test('register, login, manage a stay, generate and pay rent, and activate an invited tenant', async ({ page, request }) => {
  const staffEmail = `flow-${unique}@example.test`;
  const propertyName = `Quality House ${unique}`;
  const tenantName = `Tenant ${unique}`;
  const tenantEmail = `tenant-${unique}@example.test`;
  const tenantPhone = `9${Date.now().toString().slice(-9)}`;
  const tenantPassword = 'tenant-test-password-89';

  await page.goto('/register');
  await page.getByLabel('Full Name').fill('E2E Owner');
  await page.getByLabel('Email Address').fill(staffEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Organization Name').fill(`Quality Org ${unique}`);
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/login');
  await page.getByLabel('Email Address').fill(staffEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/');

  const staffToken = await page.evaluate(() => sessionStorage.getItem('staffAccessToken'));
  expect(staffToken).toBeTruthy();

  await page.goto('/properties');
  await page.getByRole('button', { name: 'Add Property' }).click();
  await page.getByRole('dialog').getByLabel('Property name', { exact: true }).fill(propertyName);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: propertyName, exact: true })).toBeVisible();

  await page.goto('/floors');
  await page.getByRole('button', { name: 'Add Floor' }).click();
  await page.getByRole('dialog').getByLabel('Property', { exact: true }).selectOption({ label: propertyName });
  await page.getByRole('dialog').getByLabel('Floor name', { exact: true }).fill('Ground');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Ground', exact: true })).toBeVisible();

  await page.goto('/rooms');
  await page.getByRole('button', { name: 'Add Room' }).click();
  await page.getByRole('dialog').getByLabel('Floor', { exact: true }).selectOption({ label: `${propertyName} — Ground` });
  await page.getByRole('dialog').getByLabel('Room number', { exact: true }).fill('G-01');
  await page.getByRole('dialog').getByLabel('Room type', { exact: true }).fill('Single');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'G-01' })).toBeVisible();

  await page.goto('/beds');
  await page.getByRole('button', { name: 'Add Bed' }).click();
  await page.getByRole('dialog').getByLabel('Room', { exact: true }).selectOption({ label: `${propertyName} — Ground — G-01` });
  await page.getByRole('dialog').getByLabel('Bed number', { exact: true }).fill('B-01');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'B-01' })).toBeVisible();

  await page.goto('/tenants');
  await page.getByRole('button', { name: 'Add Tenant' }).click();
  await page.getByRole('dialog').getByLabel('Full name', { exact: true }).fill(tenantName);
  await page.getByRole('dialog').getByLabel('Phone', { exact: true }).fill(tenantPhone);
  await page.getByRole('dialog').getByLabel('Email', { exact: true }).fill(tenantEmail);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: tenantName })).toBeVisible();

  const tenantListResponse = await request.get(`${apiUrl}/tenants`, { headers: authHeaders(staffToken) });
  expect(tenantListResponse.ok()).toBeTruthy();
  const tenantPage = await tenantListResponse.json();
  const tenant = tenantPage.data.find((row) => row.email === tenantEmail);
  expect(tenant).toBeTruthy();

  const inviteResponse = await request.post(`${apiUrl}/tenants/${tenant.id}/invite`, {
    headers: authHeaders(staffToken),
    data: { purpose: 'INVITE' },
  });
  expect(inviteResponse.status(), await inviteResponse.text()).toBe(201);
  const { invitationToken } = await inviteResponse.json();
  const setupResponse = await request.post(`${apiUrl}/tenant-auth/setup-password`, {
    data: { invitationToken, newPassword: tenantPassword },
  });
  expect(setupResponse.ok(), await setupResponse.text()).toBeTruthy();

  await page.goto('/stays');
  await page.getByRole('button', { name: 'Record New Stay' }).click();
  await page.getByRole('dialog').getByLabel('Tenant', { exact: true }).selectOption({ label: tenantName });
  await page.getByRole('dialog').getByLabel('Available bed', { exact: true }).selectOption({ label: `${propertyName} — G-01 — B-01` });
  const moveIn = new Date();
  moveIn.setUTCDate(moveIn.getUTCDate() - 35);
  await page.getByRole('dialog').getByLabel('Move-in date', { exact: true }).fill(moveIn.toISOString().slice(0, 10));
  await page.getByRole('dialog').getByLabel('Monthly rent (₹)', { exact: true }).fill('1250');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: tenantName })).toBeVisible();

  const stayListResponse = await request.get(`${apiUrl}/stays`, { headers: authHeaders(staffToken) });
  expect(stayListResponse.ok()).toBeTruthy();
  const stay = (await stayListResponse.json()).data.find((row) => row.tenant_name === tenantName);
  expect(stay).toBeTruthy();

  const duesResponse = await request.get(`${apiUrl}/stays/${stay.id}/rent-dues`, {
    headers: authHeaders(staffToken),
  });
  expect(duesResponse.status(), await duesResponse.text()).toBe(200);
  const { data: dues } = await duesResponse.json();
  expect(dues).toHaveLength(1);
  expect(Number(dues[0].amount_paise)).toBe(125000);

  const plannedDate = new Date();
  plannedDate.setUTCDate(plannedDate.getUTCDate() + 2);
  const stayRow = page.getByRole('row').filter({ hasText: tenantName });
  await stayRow.getByRole('button', { name: 'Plan Move-out' }).click();
  await page.getByLabel('Expected move-out date').fill(plannedDate.toISOString().slice(0, 10));
  await page.getByRole('button', { name: 'Save Move-out Date' }).click();
  await expect(stayRow.getByRole('button', { name: 'Edit Move-out Notice' })).toBeVisible();

  await page.goto('/beds');
  await page.getByLabel('Availability').selectOption('Upcoming vacancy');
  const bedRow = page.getByRole('row').filter({ hasText: tenantName });
  await expect(bedRow).toContainText(/Expected in \d+ days?/);
  await expect(bedRow.getByText('Occupied', { exact: true })).toBeVisible();

  await page.goto('/stays');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('row', { name: new RegExp(tenantName) }).getByRole('button', { name: 'Check out' }).click();
  await expect(page.getByRole('alert')).toHaveText('Record the outstanding rent payment before checking out.');

  await page.goto('/rent-dues');
  await page.getByRole('row').filter({ hasText: tenantName }).getByRole('link', { name: 'Mark Paid' }).click();
  await expect(page.getByRole('dialog', { name: 'Record Payment' })).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('Payment amount (₹)', { exact: true })).toHaveValue('1250');
  const rentMonth = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(dues[0].due_month));
  const dueOption = `${tenantName} — ${rentMonth} · Cycle 1 — ₹1,250 remaining`;
  await page.getByRole('dialog').getByLabel('Outstanding rent due', { exact: true }).selectOption({ label: dueOption });
  await page.getByRole('dialog').getByLabel('Payment amount (₹)', { exact: true }).fill('250');
  await page.getByRole('dialog').getByLabel('Payment method', { exact: true }).selectOption('UPI');
  const withoutReference = page.waitForResponse((response) =>
    response.url().endsWith('/api/payments') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save' }).click();
  const payment = await withoutReference;
  expect(payment.status()).toBe(201);
  expect((await payment.json()).reference).toBeNull();

  await page.getByRole('button', { name: 'Record Payment', exact: true }).click();
  const remainingOption = `${tenantName} — ${rentMonth} · Cycle 1 — ₹1,000 remaining`;
  await page.getByRole('dialog').getByLabel('Outstanding rent due', { exact: true }).selectOption({ label: remainingOption });
  await page.getByRole('dialog').getByLabel('Payment amount (₹)', { exact: true }).fill('1000');
  await page.getByRole('dialog').getByLabel('Payment method', { exact: true }).selectOption('UPI');
  await page.getByRole('dialog').getByLabel('Reference (optional)', { exact: true }).fill(`receipt-${unique}`);
  await page.getByRole('button', { name: 'Save' }).click();
  const paymentRow = page.getByRole('row').filter({ hasText: `receipt-${unique}` });
  await expect(paymentRow.getByText(tenantName, { exact: true })).toBeVisible();
  await paymentRow.getByRole('button', { name: 'Receipt' }).click();
  await expect(page.getByRole('dialog', { name: /Payment receipt/ })).toContainText(`receipt-${unique}`);

  await page.goto('/tenant/login');
  await page.getByLabel('Email or Phone').fill(tenantEmail);
  await page.getByLabel('Password', { exact: true }).fill(tenantPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/tenant');
  await expect(page.getByRole('heading', { name: `Welcome, ${tenantName}` })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('staffAccessToken'))).toBe(staffToken);
  expect(await page.evaluate(() => sessionStorage.getItem('tenantAccessToken'))).toBeTruthy();

  await page.getByRole('button', { name: 'My Rent & Dues' }).click();
  await expect(page.getByText('PAID', { exact: true })).toBeVisible();

  await page.goto('/stays');
  await stayRow.getByRole('button', { name: 'Edit Move-out Notice' }).click();
  await page.getByRole('button', { name: 'Clear Notice' }).click();
  await expect(stayRow.getByRole('button', { name: 'Plan Move-out' })).toBeVisible();
  await page.goto('/beds');
  await page.getByLabel('Availability').selectOption('Upcoming vacancy');
  await expect(bedRow).toHaveCount(0);
});

test('protects organization data and keeps staff and tenant sessions separate', async ({ page, request }) => {
  const orgA = await registerOrganization(request, 'alpha');
  const orgB = await registerOrganization(request, 'beta');

  const propertyResponse = await request.post(`${apiUrl}/properties`, {
    headers: authHeaders(orgA.token),
    data: { name: `Private Property ${unique}` },
  });
  expect(propertyResponse.status(), await propertyResponse.text()).toBe(201);

  const tenantResponse = await request.post(`${apiUrl}/tenants`, {
    headers: authHeaders(orgA.token),
    data: { name: `Private Tenant ${unique}`, phone: `8${Date.now().toString().slice(-9)}`, email: `private-${unique}@example.test` },
  });
  expect(tenantResponse.status(), await tenantResponse.text()).toBe(201);
  const privateTenant = await tenantResponse.json();

  const betaProperties = await request.get(`${apiUrl}/properties`, { headers: authHeaders(orgB.token) });
  expect(betaProperties.ok()).toBeTruthy();
  expect((await betaProperties.json()).data).toHaveLength(0);

  const crossOrgTenant = await request.get(`${apiUrl}/tenants/${privateTenant.id}`, { headers: authHeaders(orgB.token) });
  expect(crossOrgTenant.status()).toBe(404);
  const crossOrgInvite = await request.post(`${apiUrl}/tenants/${privateTenant.id}/invite`, {
    headers: authHeaders(orgB.token),
    data: { purpose: 'INVITE' },
  });
  expect(crossOrgInvite.status()).toBe(404);

  await page.goto('/login');
  await page.getByLabel('Email Address').fill(orgB.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/properties');
  await expect(page.getByRole('heading', { name: 'No properties yet' })).toBeVisible();
  await expect(page.getByText(`Private Property ${unique}`)).not.toBeVisible();

  await page.evaluate(() => {
    sessionStorage.removeItem('staffAccessToken');
    sessionStorage.setItem('tenantAccessToken', 'tenant-session-only');
  });
  await page.reload();
  await page.goto('/');
  await expect(page).toHaveURL('/login');
  await page.goto('/tenant');
  await expect(page).toHaveURL('/tenant/login');
});

test('owner invites and assigns a property manager who sees only their property', async ({ page, request }) => {
  const owner = await registerOrganization(request, 'manager-flow');
  const managerEmail = `manager-user-${unique}@example.test`;
  for (const name of ['Assigned House', 'Private House']) {
    const property = await request.post(`${apiUrl}/properties`, { headers: authHeaders(owner.token), data: { name } });
    expect(property.status(), await property.text()).toBe(201);
  }

  await page.goto('/login');
  await page.getByLabel('Email Address').fill(owner.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'Navigate to Managers' }).click();
  await page.getByRole('button', { name: 'Invite Manager' }).click();
  const invite = page.getByRole('dialog', { name: 'Invite Property Manager' });
  await invite.getByLabel('Full name').fill('Branch Manager');
  await invite.getByLabel('Email').fill(managerEmail);
  await invite.getByLabel('Property').selectOption({ label: 'Assigned House' });
  await invite.getByRole('button', { name: 'Create Invite Link' }).click();
  const url = await invite.getByLabel('Invitation link').inputValue();

  const managerPage = await page.context().newPage();
  await managerPage.goto(url);
  await managerPage.getByLabel('Choose a password').fill(password);
  await managerPage.getByRole('button', { name: 'Accept Invitation' }).click();
  await managerPage.getByRole('link', { name: 'Sign in' }).click();
  await managerPage.getByLabel('Email Address').fill(managerEmail);
  await managerPage.getByLabel('Password', { exact: true }).fill(password);
  await managerPage.getByRole('button', { name: 'Sign In' }).click();
  await managerPage.getByRole('button', { name: 'Navigate to Properties' }).click();
  await expect(managerPage.getByRole('heading', { name: 'Assigned House' })).toBeVisible();
  await expect(managerPage.getByRole('heading', { name: 'Private House' })).toHaveCount(0);
  await expect(managerPage.getByRole('button', { name: 'Add Property' })).toHaveCount(0);

  await page.goto('/managers');
  await page.getByRole('button', { name: 'Edit Assignments' }).click();
  const assignment = page.getByRole('dialog', { name: /Assign Properties/ });
  await assignment.getByLabel('Assigned House').uncheck();
  await assignment.getByLabel('Private House').check();
  await assignment.getByRole('button', { name: 'Save Assignments' }).click();
  await expect(page.getByRole('row').filter({ hasText: managerEmail })).toContainText('Private House');
  await managerPage.reload();
  await expect(managerPage.getByRole('heading', { name: 'Private House' })).toBeVisible();
  await expect(managerPage.getByRole('heading', { name: 'Assigned House' })).toHaveCount(0);
  await managerPage.close();
});

test('a floor can contain apartments as well as rooms directly on the floor', async ({ page, request }) => {
  const owner = await registerOrganization(request, 'apartment-flow');
  const headers = authHeaders(owner.token);
  const property = await request.post(`${apiUrl}/properties`, { headers, data: { name: 'Apartment PG' } });
  expect(property.status()).toBe(201);
  const floor = await request.post(`${apiUrl}/floors`, {
    headers, data: { propertyId: (await property.json()).id, name: 'First' },
  });
  expect(floor.status()).toBe(201);
  const floorId = (await floor.json()).id;
  const direct = await request.post(`${apiUrl}/rooms`, { headers, data: { floorId, room_number: 'Direct room' } });
  expect(direct.status()).toBe(201);

  await page.goto('/login');
  await page.getByLabel('Email Address').fill(owner.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'Navigate to Floors' }).click();
  await page.getByRole('link', { name: 'Apartments' }).click();
  await page.getByRole('button', { name: 'Add Apartment' }).click();
  const apartmentForm = page.getByRole('dialog', { name: 'Add Apartment' });
  await expect(apartmentForm.getByLabel('Floor', { exact: true })).toHaveValue(String(floorId));
  await apartmentForm.getByLabel('Apartment name').fill('Flat A');
  await apartmentForm.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('row').filter({ hasText: 'Flat A' }).getByRole('link', { name: 'View Rooms' }).click();
  await page.getByRole('button', { name: 'Add Room' }).click();
  const roomForm = page.getByRole('dialog', { name: 'Add Room' });
  await expect(roomForm.getByLabel('Apartment (optional)')).toHaveValue(/^[1-9]\d*$/);
  await roomForm.getByLabel('Room number', { exact: true }).fill('Flat A Bedroom');
  await roomForm.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Flat A Bedroom' }).getByRole('cell', { name: 'Flat A', exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Direct room' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Navigate to Rooms' }).click();
  await page.getByRole('row').filter({ hasText: 'Direct room' }).getByRole('button', { name: 'Set Apartment' }).click();
  const assignment = page.getByRole('dialog', { name: 'Apartment for room Direct room' });
  await assignment.getByLabel('Apartment on First').selectOption({ label: 'Flat A' });
  await assignment.getByRole('button', { name: 'Save assignment' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Direct room' })).toContainText('Flat A');
});
