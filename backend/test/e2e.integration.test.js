const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const jwt = require("jsonwebtoken");
const { createIsolatedTestDatabase } = require("../test-support/isolated-test-db");

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const shouldSkip = !testDatabaseUrl;
const jwtSecret = "integration-test-secret-with-at-least-thirty-two-characters";
let isolatedDatabase;
let pool;
let server;
let baseUrl;
let ownerToken;
let organizationId;
let tenantId;
let stayId;
let rentDueId;
let tenantToken;
let propertyId;

async function request(path, { method = "GET", token = ownerToken, body, headers = {} } = {}) {
    const requestHeaders = { ...headers };
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
    if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
}

async function register(email, organizationName) {
    const result = await request("/api/auth/register", {
        method: "POST",
        token: null,
        body: {
            name: "Test Owner",
            email,
            password: "correct-horse-battery-staple",
            organizationName,
        },
    });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return result.body;
}

before(async () => {
    if (shouldSkip) return;
    isolatedDatabase = await createIsolatedTestDatabase();
    process.env.DATABASE_URL = isolatedDatabase.databaseUrl;
    process.env.JWT_SECRET = jwtSecret;
    process.env.LOG_LEVEL = "silent";
    process.env.AUTH_RATE_LIMIT_MAX = "1000";
    pool = isolatedDatabase.pool;
    await isolatedDatabase.migrate();

    const { createApp } = require("../app");
    const { loadEnv } = require("../config/env");
    const app = createApp(loadEnv({
        NODE_ENV: "test",
        DATABASE_URL: isolatedDatabase.databaseUrl,
        JWT_SECRET: jwtSecret,
        LOG_LEVEL: "silent",
        AUTH_RATE_LIMIT_MAX: "1000",
    }));
    server = app.listen(0);
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const account = await register("owner-one@example.test", "Organization One");
    ownerToken = account.token;
    organizationId = account.organization.id;
});

after(async () => {
    if (shouldSkip) return;
    if (server) {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    if (isolatedDatabase) await isolatedDatabase.close();
});

test("owner registration and login create and authenticate a tenant organization", { skip: shouldSkip }, async () => {
    const login = await request("/api/auth/login", {
        method: "POST",
        token: null,
        body: { email: "owner-one@example.test", password: "correct-horse-battery-staple" },
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.organizationId, organizationId);
    assert.equal(login.body.role, "owner");

    const profile = await request("/api/auth/me", { token: login.body.token });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.organizationId, organizationId);
    assert.equal(profile.body.email, "owner-one@example.test");

    const organizations = await request("/api/organizations");
    assert.equal(organizations.status, 200);
    assert.equal(organizations.body.data.length, 1);
    assert.equal(organizations.body.data[0].name, "Organization One");
});

test("tenant setup invitation provisions a usable tenant portal account", { skip: shouldSkip }, async () => {
    const created = await request("/api/tenants", {
        method: "POST",
        body: { name: "Avery Tenant", phone: "555-100-2000", email: "avery@example.test" },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    tenantId = created.body.id;

    const invite = await request(`/api/tenants/${tenantId}/invite`, {
        method: "POST",
        body: {},
    });
    assert.equal(invite.status, 201, JSON.stringify(invite.body));
    assert.ok(invite.body.invitationToken);
    assert.equal(invite.body.purpose, "INVITE");

    const setup = await request("/api/tenant-auth/setup-password", {
        method: "POST",
        token: null,
        body: {
            invitationToken: invite.body.invitationToken,
            newPassword: "tenant-password-123",
        },
    });
    assert.equal(setup.status, 200, JSON.stringify(setup.body));

    const login = await request("/api/tenant-auth/login", {
        method: "POST",
        token: null,
        body: { identifier: "avery@example.test", password: "tenant-password-123" },
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    assert.equal(login.body.tenant.id, tenantId);
    tenantToken = login.body.token;
});

test("tenant assignment, rent generation, payment, and portal reads are scoped to the organization", { skip: shouldSkip }, async () => {
    const property = await request("/api/properties", {
        method: "POST",
        body: { name: "Test House" },
    });
    assert.equal(property.status, 201, JSON.stringify(property.body));
    propertyId = property.body.id;

    const floor = await request("/api/floors", {
        method: "POST",
        body: { propertyId, name: "Ground" },
    });
    assert.equal(floor.status, 201, JSON.stringify(floor.body));
    const room = await request("/api/rooms", {
        method: "POST",
        body: { floorId: floor.body.id, room_number: "101", room_type: "Private" },
    });
    assert.equal(room.status, 201, JSON.stringify(room.body));
    const bed = await request("/api/beds", {
        method: "POST",
        body: { roomId: room.body.id, bed_number: "A" },
    });
    assert.equal(bed.status, 201, JSON.stringify(bed.body));

    const stay = await request("/api/stays", {
        method: "POST",
        body: {
            tenantId,
            bedId: bed.body.id,
            moveInDate: "2026-10-01",
            monthly_rent_paise: 125000,
        },
    });
    assert.equal(stay.status, 201, JSON.stringify(stay.body));
    stayId = stay.body.id;
    assert.equal(stay.body.tenant_id, tenantId);
    assert.equal(stay.body.bed_status, "OCCUPIED");

    const generated = await request("/api/rent-dues/generate", {
        method: "POST",
        body: { dueMonth: "2026-10-01", amount_paise: 125000, dueDate: "2026-10-05" },
    });
    assert.equal(generated.status, 201, JSON.stringify(generated.body));
    assert.equal(generated.body.created_count, 1);
    rentDueId = generated.body.created[0].id;
    assert.equal(Number(generated.body.created[0].amount_paise), 125000);

    const repeatedGeneration = await request("/api/rent-dues/generate", {
        method: "POST",
        body: { dueMonth: "2026-10-01", amount_paise: 125000, dueDate: "2026-10-05" },
    });
    assert.equal(repeatedGeneration.status, 201);
    assert.equal(repeatedGeneration.body.created_count, 0);
    assert.equal(repeatedGeneration.body.skipped_count, 1);

    const payment = await request("/api/payments", {
        method: "POST",
        headers: { "Idempotency-Key": "rent-payment-key-0001" },
        body: { rentDueId, amount_paise: 125000, payment_method: "CASH", reference: "receipt-1" },
    });
    assert.equal(payment.status, 201, JSON.stringify(payment.body));
    assert.equal(Number(payment.body.amount_paise), 125000);

    const summary = await request(`/api/rent-dues/${rentDueId}/summary`);
    assert.equal(summary.status, 200, JSON.stringify(summary.body));
    assert.equal(summary.body.status, "PAID");

    const tenantDues = await request("/api/tenant-portal/my-rent-dues", { token: tenantToken });
    assert.equal(tenantDues.status, 200, JSON.stringify(tenantDues.body));
    assert.equal(tenantDues.body.data.length, 1);
    assert.equal(tenantDues.body.data[0].status, "PAID");

    const adminTokenUsedAsTenant = await request("/api/tenant-portal/me", { token: ownerToken });
    assert.equal(adminTokenUsedAsTenant.status, 403);

    const secondAccount = await register("owner-two@example.test", "Organization Two");
    const secondToken = secondAccount.token;
    const secondProperties = await request("/api/properties", { token: secondToken });
    assert.equal(secondProperties.status, 200);
    assert.equal(secondProperties.body.data.length, 0);

    const otherTenantLookup = await request(`/api/tenants/${tenantId}`, { token: secondToken });
    assert.equal(otherTenantLookup.status, 404);
    const otherRentDue = await request(`/api/rent-dues/${rentDueId}/summary`, { token: secondToken });
    assert.equal(otherRentDue.status, 404);
    const crossOrganizationPayment = await request("/api/payments", {
        method: "POST",
        token: secondToken,
        headers: { "Idempotency-Key": "cross-org-payment-key-1" },
        body: { rentDueId, amount_paise: 100, payment_method: "CASH" },
    });
    assert.equal(crossOrganizationPayment.status, 404);
    const crossOrganizationStay = await request("/api/stays", {
        method: "POST",
        token: secondToken,
        body: {
            tenantId,
            bedId: bed.body.id,
            moveInDate: "2026-10-01",
            monthly_rent_paise: 125000,
        },
    });
    assert.equal(crossOrganizationStay.status, 404);

    await pool.query(
        "UPDATE organization_members SET role = 'staff' WHERE organization_id = $1 AND user_id = $2",
        [secondAccount.organization.id, secondAccount.user.id]
    );
    const staffToken = jwt.sign({
        userId: secondAccount.user.id,
        email: secondAccount.user.email,
        organizationId: secondAccount.organization.id,
        role: "staff",
    }, jwtSecret);
    const forbiddenFinanceRead = await request(`/api/payments?rentDueId=${rentDueId}`, { token: staffToken });
    assert.equal(forbiddenFinanceRead.status, 403);
    const forbiddenFinanceWrite = await request("/api/rent-dues/generate", {
        method: "POST",
        token: staffToken,
        body: { dueMonth: "2026-11-01", amount_paise: 125000, dueDate: "2026-11-05" },
    });
    assert.equal(forbiddenFinanceWrite.status, 403);

    const secondOrgGeneration = await request("/api/rent-dues/generate", {
        method: "POST",
        token: secondToken,
        body: { dueMonth: "2026-11-01", amount_paise: 125000, dueDate: "2026-11-05" },
    });
    assert.equal(secondOrgGeneration.status, 201);
    assert.equal(secondOrgGeneration.body.created_count, 0);
});

test("isolated schema contains only the test run's tenant and stay rows", { skip: shouldSkip }, async () => {
    const result = await pool.query(
        `SELECT
            (SELECT COUNT(*)::int FROM tenants WHERE organization_id = $1) AS tenants,
            (SELECT COUNT(*)::int FROM stays WHERE organization_id = $1) AS stays,
            (SELECT COUNT(*)::int FROM rent_dues rd JOIN stays s ON s.id = rd.stay_id WHERE s.organization_id = $1) AS dues`,
        [organizationId]
    );
    assert.equal(result.rows[0].tenants, 1);
    assert.equal(result.rows[0].stays, 1);
    assert.equal(result.rows[0].dues, 1);
    assert.ok(propertyId);
    assert.ok(stayId);
    assert.ok(rentDueId);
});
