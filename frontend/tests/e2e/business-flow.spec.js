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
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Organization Name').fill(`Quality Org ${unique}`);
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/login');
  await page.getByLabel('Email Address').fill(staffEmail);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/');

  const staffToken = await page.evaluate(() => sessionStorage.getItem('staffAccessToken'));
  expect(staffToken).toBeTruthy();

  await page.goto('/properties');
  await page.getByLabel('Property name').fill(propertyName);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: propertyName })).toBeVisible();

  await page.goto('/floors');
  await page.getByLabel('Property', { exact: true }).selectOption({ label: propertyName });
  await page.getByLabel('Floor name').fill('Ground');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'Ground' })).toBeVisible();

  await page.goto('/rooms');
  await page.getByLabel('Floor', { exact: true }).selectOption({ label: `${propertyName} — Ground` });
  await page.getByLabel('Room number').fill('G-01');
  await page.getByLabel('Room type').fill('Single');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'G-01' })).toBeVisible();

  await page.goto('/beds');
  await page.getByLabel('Room', { exact: true }).selectOption({ label: `${propertyName} — Ground — G-01` });
  await page.getByLabel('Bed number').fill('B-01');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'B-01' })).toBeVisible();

  await page.goto('/tenants');
  await page.getByLabel('Full name').fill(tenantName);
  await page.getByLabel('Phone').fill(tenantPhone);
  await page.getByLabel('Email').fill(tenantEmail);
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
  await page.getByLabel('Tenant', { exact: true }).selectOption({ label: tenantName });
  await page.getByLabel('Available bed').selectOption({ label: `${propertyName} — G-01 — B-01` });
  await page.getByLabel('Move-in date').fill('2026-10-01');
  await page.getByLabel('Monthly rent (₹)').fill('1250');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: tenantName })).toBeVisible();

  const stayListResponse = await request.get(`${apiUrl}/stays`, { headers: authHeaders(staffToken) });
  expect(stayListResponse.ok()).toBeTruthy();
  const stay = (await stayListResponse.json()).data.find((row) => row.tenant_name === tenantName);
  expect(stay).toBeTruthy();

  const generateResponse = await request.post(`${apiUrl}/rent-dues/generate`, {
    headers: authHeaders(staffToken),
    data: {
      dueMonth: '2026-11-01',
      // Required by request validation; generated dues use the stay's rate plan.
      amount_paise: 125000,
      dueDate: '2026-11-05',
    },
  });
  expect(generateResponse.status(), await generateResponse.text()).toBe(201);
  const generatedDues = await generateResponse.json();
  expect(generatedDues.created_count).toBe(1);
  expect(Number(generatedDues.created[0].amount_paise)).toBe(125000);

  await page.goto('/payments');
  const dueOption = `${tenantName} — November 2026 — ₹1,250 remaining`;
  await page.getByLabel('Outstanding rent due').selectOption({ label: dueOption });
  await page.getByLabel('Payment amount (₹)').fill('1250');
  await page.getByLabel('Payment method').selectOption('UPI');
  await page.getByLabel('Reference (optional)').fill(`receipt-${unique}`);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: tenantName })).toBeVisible();
  await expect(page.getByRole('cell', { name: `receipt-${unique}` })).toBeVisible();

  await page.goto('/tenant/login');
  await page.getByLabel('Email or Phone').fill(tenantEmail);
  await page.getByLabel('Password').fill(tenantPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/tenant');
  await expect(page.getByRole('heading', { name: `Welcome, ${tenantName}` })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('staffAccessToken'))).toBe(staffToken);
  expect(await page.evaluate(() => sessionStorage.getItem('tenantAccessToken'))).toBeTruthy();

  await page.getByRole('button', { name: 'My Rent & Dues' }).click();
  await expect(page.getByText('PAID', { exact: true })).toBeVisible();
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
  await page.getByLabel('Password').fill(password);
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
