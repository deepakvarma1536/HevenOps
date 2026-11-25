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
    delete process.env.JWT_EXPIRES_IN;
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
    for (const token of [ownerToken, login.body.token]) {
        const claims = jwt.verify(token, jwtSecret);
        assert.equal(claims.exp - claims.iat, 900);
    }

    const profile = await request("/api/auth/me", { token: login.body.token });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.organizationId, organizationId);
    assert.equal(profile.body.email, "owner-one@example.test");

    const organizations = await request("/api/organizations");
    assert.equal(organizations.status, 200);
    assert.equal(organizations.body.data.length, 1);
    assert.equal(organizations.body.data[0].name, "Organization One");
});

test("spends are scoped to the organization and concurrent retries record money once", { skip: shouldSkip }, async () => {
    const method = "POST";
    const headers = { "Idempotency-Key": "spend-test-key-0001" };
    const body = { amount_paise: 125025, description: "  Plumbing repair  " };
    const submit = (options = {}) => request("/api/spends", { method, headers, body, ...options });

    assert.equal((await submit({ token: null })).status, 401);
    assert.equal((await submit({ body: { ...body, description: " " } })).status, 400);
    assert.equal((await submit({ body: { ...body, amount_paise: 1.25 } })).status, 400);
    assert.equal((await submit({ headers: {} })).status, 400);
    const staffToken = jwt.sign({ organizationId, role: "staff" }, jwtSecret);
    assert.equal((await submit({ token: staffToken })).status, 403);
    assert.equal((await request("/api/spends", { token: staffToken })).status, 403);

    const attempts = await Promise.all([submit(), submit()]);
    assert.deepEqual(attempts.map(({ status }) => status).sort(), [200, 201]);
    assert.deepEqual(attempts[0].body, attempts[1].body);
    const spend = attempts[0].body;
    assert.equal(spend.description, "Plumbing repair");
    assert.equal(Number(spend.amount_paise), 125025);
    assert.equal((await submit({ body: { ...body, amount_paise: 100 } })).status, 409);

    const second = await register("spend-owner@example.test", "Other Spend Organization");
    const otherList = await request("/api/spends", { token: second.token });
    assert.equal(otherList.status, 200);
    assert.deepEqual(otherList.body.data, []);
    assert.equal((await submit({ token: second.token })).status, 201);

    const ownerList = await request("/api/spends");
    assert.equal(ownerList.status, 200);
    assert.deepEqual(ownerList.body.data, [spend]);
    assert.equal(ownerList.body.pagination.total, 1);
});

test("sharing rooms cap active beds even when bed creation and room updates race", { skip: shouldSkip }, async () => {
    const property = await request("/api/properties", { method: "POST", body: { name: "Sharing House" } });
    assert.equal(property.status, 201);
    const floor = await request("/api/floors", { method: "POST", body: { propertyId: property.body.id, name: "Ground" } });
    assert.equal(floor.status, 201);
    const room = await request("/api/rooms", {
        method: "POST",
        body: { floorId: floor.body.id, room_number: "303", room_type: "3 Sharing" },
    });
    assert.equal(room.status, 201);
    assert.equal(room.body.bed_capacity, 3);

    const rooms = await request(`/api/rooms?floorId=${floor.body.id}`);
    assert.equal(rooms.body.data[0].bed_capacity, 3);
    const addBed = (bedNumber) => request("/api/beds", {
        method: "POST",
        body: { roomId: room.body.id, bed_number: bedNumber },
    });
    const changeRoom = (body) => request(`/api/rooms/${room.body.id}`, { method: "PATCH", body });
    assert.equal((await addBed("A")).status, 201);
    assert.equal((await addBed("B")).status, 201);
    const attempts = await Promise.all([addBed("C"), addBed("D")]);
    assert.deepEqual(attempts.map(({ status }) => status).sort(), [201, 409]);
    assert.equal(attempts.find(({ status }) => status === 409).body.error.code, "ROOM_CAPACITY_REACHED");

    const renamed = await changeRoom({ room_number: "303A" });
    assert.equal(renamed.body.bed_capacity, 3);
    const reduced = await changeRoom({ room_number: "303A", room_type: "Double sharing" });
    assert.equal(reduced.status, 409);
    assert.equal(reduced.body.error.code, "ROOM_CAPACITY_TOO_LOW");

    const added = attempts.find(({ status }) => status === 201);
    assert.equal((await request(`/api/beds/${added.body.id}`, { method: "DELETE" })).status, 200);
    const [replacement, resize] = await Promise.all([
        addBed("E"),
        changeRoom({ room_number: "303A", room_type: "Double sharing" }),
    ]);
    assert.ok(
        (replacement.status === 201 && resize.status === 409) ||
        (replacement.status === 409 && resize.status === 200)
    );
    const currentBeds = await request(`/api/beds?roomId=${room.body.id}`);
    assert.equal(currentBeds.body.pagination.total, replacement.status === 201 ? 3 : 2);

    const expanded = await changeRoom({ room_number: "303A", room_type: "4-sharing" });
    assert.equal(expanded.body.bed_capacity, 4);
    assert.equal((await addBed("F")).status, 201);
});

test("floor names, room numbers, and bed numbers are unique within a property", { skip: shouldSkip }, async () => {
    async function create(path, body) {
        const result = await request(path, { method: "POST", body });
        assert.equal(result.status, 201, JSON.stringify(result.body));
        return result.body;
    }

    async function expectDuplicate(path, body, code, method = "POST") {
        const result = await request(path, { method, body });
        assert.equal(result.status, 409, JSON.stringify(result.body));
        assert.equal(result.body.error.code, code);
    }

    const property = await create("/api/properties", { name: "Name Check House" });
    const other = await create("/api/properties", { name: "Other Name Check House" });
    const ground = await create("/api/floors", { propertyId: property.id, name: "Ground" });
    const first = await create("/api/floors", { propertyId: property.id, name: "First" });
    const otherGround = await create("/api/floors", { propertyId: other.id, name: "Ground" });

    await expectDuplicate("/api/floors", { propertyId: property.id, name: "  ground  " }, "DUPLICATE_FLOOR_NAME");
    await expectDuplicate(`/api/floors/${first.id}`, { name: "gRoUnD" }, "DUPLICATE_FLOOR_NAME", "PATCH");

    const roomA = await create("/api/rooms", { floorId: ground.id, room_number: "Room-A" });
    const roomB = await create("/api/rooms", { floorId: first.id, room_number: "Room-B" });
    const otherRoom = await create("/api/rooms", { floorId: otherGround.id, room_number: "Room-A" });
    await expectDuplicate("/api/rooms", { floorId: first.id, room_number: "  room-a  " }, "DUPLICATE_ROOM_NAME");
    await expectDuplicate(`/api/rooms/${roomB.id}`, { room_number: "Room-A" }, "DUPLICATE_ROOM_NAME", "PATCH");

    const attempts = await Promise.all([roomA, roomB].map((room) => request("/api/beds", {
        method: "POST",
        body: { roomId: room.id, bed_number: "Bed-1" },
    })));
    assert.deepEqual(attempts.map(({ status }) => status).sort(), [201, 409]);
    assert.equal(attempts.find(({ status }) => status === 409).body.error.code, "DUPLICATE_BED_NAME");
    const bed = attempts.find(({ status }) => status === 201).body;
    const otherRoomInProperty = bed.room_id === roomA.id ? roomB : roomA;
    assert.equal((await request(`/api/beds/${bed.id}`, { method: "DELETE" })).status, 200);
    const reused = await create("/api/beds", { roomId: otherRoomInProperty.id, bed_number: "  bed-1  " });
    assert.equal(reused.bed_number, "bed-1");
    assert.equal((await pool.query("SELECT id FROM beds WHERE id = $1", [bed.id])).rowCount, 0);
    await create("/api/beds", { roomId: otherRoom.id, bed_number: "Bed-1" });
});

test("deleting inventory permanently removes its descendants and preserves siblings", { skip: shouldSkip }, async () => {
    async function create(path, body) {
        const result = await request(path, { method: "POST", body });
        assert.equal(result.status, 201, JSON.stringify(result.body));
        return result.body;
    }

    const property = await create("/api/properties", { name: "Delete Test House" });
    const floor = await create("/api/floors", { propertyId: property.id, name: "Ground" });
    const sibling = await create("/api/floors", { propertyId: property.id, name: "First" });
    const roomA = await create("/api/rooms", { floorId: floor.id, room_number: "A" });
    const roomB = await create("/api/rooms", { floorId: floor.id, room_number: "B" });
    const siblingRoom = await create("/api/rooms", { floorId: sibling.id, room_number: "C" });
    const bedA = await create("/api/beds", { roomId: roomA.id, bed_number: "A1" });
    const bedB = await create("/api/beds", { roomId: roomB.id, bed_number: "B1" });
    const siblingBed = await create("/api/beds", { roomId: siblingRoom.id, bed_number: "C1" });
    await pool.query("UPDATE rooms SET archived_at = CURRENT_TIMESTAMP WHERE id = $1", [roomB.id]);

    const staffToken = jwt.sign({ organizationId, role: "staff" }, jwtSecret);
    const otherOrg = await register("delete-other-owner@example.test", "Other Delete Test House");
    const path = `/api/floors/${floor.id}`;
    assert.equal((await request(path, { method: "DELETE", token: staffToken })).status, 403);
    assert.equal((await request(path, { method: "DELETE", token: otherOrg.token })).status, 404);
    assert.equal((await request(path, { method: "DELETE" })).status, 200);
    assert.equal((await request(path, { method: "DELETE" })).status, 404);

    assert.equal((await pool.query("SELECT id FROM floors WHERE id = $1", [floor.id])).rowCount, 0);
    assert.equal((await pool.query("SELECT id FROM rooms WHERE id = ANY($1::bigint[])", [[roomA.id, roomB.id]])).rowCount, 0);
    assert.equal((await pool.query("SELECT id FROM beds WHERE id = ANY($1::bigint[])", [[bedA.id, bedB.id]])).rowCount, 0);
    assert.equal((await pool.query("SELECT id FROM beds WHERE id = $1", [siblingBed.id])).rowCount, 1);

    assert.equal((await request(`/api/rooms/${siblingRoom.id}`, { method: "DELETE" })).status, 200);
    assert.equal((await pool.query("SELECT id FROM beds WHERE id = $1", [siblingBed.id])).rowCount, 0);
    assert.equal((await request(`/api/properties/${property.id}`, { method: "DELETE" })).status, 200);
    assert.equal((await pool.query("SELECT id FROM floors WHERE id = $1", [sibling.id])).rowCount, 0);
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

    const { rows: [billingDates] } = await pool.query(
        `SELECT to_char(CURRENT_DATE - 35, 'YYYY-MM-DD') AS move_in,
                to_char(CURRENT_DATE - 5, 'YYYY-MM-DD') AS due_date`
    );
    const stay = await request("/api/stays", {
        method: "POST",
        body: {
            tenantId,
            bedId: bed.body.id,
            moveInDate: billingDates.move_in,
            monthly_rent_paise: 125000,
        },
    });
    assert.equal(stay.status, 201, JSON.stringify(stay.body));
    stayId = stay.body.id;
    assert.equal(stay.body.tenant_id, tenantId);
    assert.equal(stay.body.bed_status, "OCCUPIED");

    const automatic = await request(`/api/stays/${stayId}/rent-dues`);
    assert.equal(automatic.status, 200, JSON.stringify(automatic.body));
    assert.equal(automatic.body.data.length, 1);
    const [automaticDue] = automatic.body.data;
    assert.equal(automaticDue.due_date, billingDates.due_date);
    assert.equal(automaticDue.billing_cycle, 1);
    assert.equal(Number(automaticDue.amount_paise), 125000);

    const repeatedGeneration = await request("/api/rent-dues/generate", {
        method: "POST",
        body: { dueMonth: automaticDue.due_month, amount_paise: 125000, dueDate: automaticDue.due_date },
    });
    assert.equal(repeatedGeneration.status, 201);
    assert.equal(repeatedGeneration.body.created_count, 0);
    assert.equal(repeatedGeneration.body.skipped_count, 1);

    // Simulate a stay entered before automatic billing was available.
    await pool.query("DELETE FROM rent_dues WHERE id = $1", [automaticDue.id]);
    const checkout = await request(`/api/stays/${stayId}/checkout`, { method: "PATCH", body: {} });
    assert.equal(checkout.status, 409, JSON.stringify(checkout.body));
    assert.equal(checkout.body.error.code, "OUTSTANDING_RENT");
    assert.equal(checkout.body.error.details.amount_remaining_paise, "125000");
    const backfilled = await request(`/api/stays/${stayId}/rent-dues`);
    assert.equal(backfilled.body.data.length, 1);
    rentDueId = backfilled.body.data[0].id;
    const currentStay = await request(`/api/stays/${stayId}`);
    assert.equal(currentStay.body.move_out_date, null);
    assert.equal(currentStay.body.bed_status, "OCCUPIED");

    await pool.query("UPDATE rent_dues SET due_date = CURRENT_DATE - 1, status = 'DUE' WHERE id = $1", [rentDueId]);
    const staffOverdue = await request(`/api/stays/${stayId}/rent-dues?status=OVERDUE`);
    assert.equal(staffOverdue.status, 200, JSON.stringify(staffOverdue.body));
    assert.equal(staffOverdue.body.data[0].status, "OVERDUE");
    assert.equal(Number(staffOverdue.body.data[0].amount_remaining_paise), 125000);
    const tenantOverdue = await request("/api/tenant-portal/my-rent-dues?status=OVERDUE", { token: tenantToken });
    assert.equal(tenantOverdue.status, 200, JSON.stringify(tenantOverdue.body));
    assert.equal(tenantOverdue.body.data[0].status, "OVERDUE");
    assert.equal(Number(tenantOverdue.body.data[0].amount_remaining_paise), 125000);

    const partialPayment = await request("/api/payments", {
        method: "POST",
        headers: { "Idempotency-Key": "rent-payment-partial-0001" },
        body: { rentDueId, amount_paise: 25000, payment_method: "CASH" },
    });
    assert.equal(partialPayment.status, 201, JSON.stringify(partialPayment.body));
    const partialCheckout = await request(`/api/stays/${stayId}/checkout`, { method: "PATCH", body: {} });
    assert.equal(partialCheckout.status, 409);
    assert.equal(partialCheckout.body.error.details.amount_remaining_paise, "100000");

    const payment = await request("/api/payments", {
        method: "POST",
        headers: { "Idempotency-Key": "rent-payment-key-0001" },
        body: { rentDueId, amount_paise: 100000, payment_method: "CASH", reference: "receipt-1" },
    });
    assert.equal(payment.status, 201, JSON.stringify(payment.body));
    assert.equal(Number(payment.body.amount_paise), 100000);

    const summary = await request(`/api/rent-dues/${rentDueId}/summary`);
    assert.equal(summary.status, 200, JSON.stringify(summary.body));
    assert.equal(summary.body.status, "PAID");

    const tenantDues = await request("/api/tenant-portal/my-rent-dues", { token: tenantToken });
    assert.equal(tenantDues.status, 200, JSON.stringify(tenantDues.body));
    assert.equal(tenantDues.body.data.length, 1);
    assert.equal(tenantDues.body.data[0].status, "PAID");
    assert.equal(Number(tenantDues.body.data[0].amount_remaining_paise), 0);

    const spare = await request("/api/beds", { method: "POST", body: { roomId: room.body.id, bed_number: "Spare" } });
    assert.equal(spare.status, 201);
    for (const path of [`/api/beds/${bed.body.id}`, `/api/rooms/${room.body.id}`, `/api/floors/${floor.body.id}`, `/api/properties/${propertyId}`]) {
        const blocked = await request(path, { method: "DELETE" });
        assert.equal(blocked.status, 409, JSON.stringify({ path, body: blocked.body }));
        assert.equal(blocked.body.error.code, "INVENTORY_HAS_STAYS");
    }
    assert.equal((await pool.query("SELECT id FROM beds WHERE room_id = $1", [room.body.id])).rowCount, 2);
    assert.equal((await request(`/api/rent-dues/${rentDueId}/summary`)).body.status, "PAID");

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

test("scheduled rent generation fills missing dues for a partly billed month", { skip: shouldSkip }, async () => {
    const { rows: [dates] } = await pool.query(
        `SELECT to_char(date_trunc('month', CURRENT_DATE::timestamp) + INTERVAL '1 month', 'YYYY-MM-DD') AS due_month,
                to_char(date_trunc('month', CURRENT_DATE::timestamp) + INTERVAL '1 month 4 days', 'YYYY-MM-DD') AS due_date,
                to_char(date_trunc('month', CURRENT_DATE::timestamp) + INTERVAL '1 month 5 days', 'YYYY-MM-DD') AS manual_due_date`
    );
    const existing = await request("/api/rent-dues", {
        method: "POST",
        body: { stayId, dueMonth: dates.due_month, dueDate: dates.manual_due_date, amount_paise: 130000 },
    });
    assert.equal(existing.status, 201, JSON.stringify(existing.body));

    const { rows: [newTenant] } = await pool.query(
        "INSERT INTO tenants (organization_id, name, phone) VALUES ($1, 'October Move-In', '555-901-2000') RETURNING id",
        [organizationId]
    );
    const { rows: [newStay] } = await pool.query(
        `INSERT INTO stays (organization_id, tenant_id, bed_id, move_in_date)
         SELECT $1, $2, b.id, CURRENT_DATE
         FROM beds b JOIN rooms r ON r.id = b.room_id JOIN floors f ON f.id = r.floor_id
         WHERE f.property_id = $3 AND b.bed_number = 'Spare' RETURNING id`,
        [organizationId, newTenant.id, propertyId]
    );
    await pool.query(
        "INSERT INTO stay_rate_plans (stay_id, effective_from, monthly_rent_paise) VALUES ($1, CURRENT_DATE, 900000)",
        [newStay.id]
    );

    const payload = { dueMonth: dates.due_month, dueDate: dates.due_date };
    const generate = () => request("/api/rent-dues/generate", {
        method: "POST", body: { ...payload, amount_paise: 900000 },
    });
    assert.equal((await generate()).body.created_count, 1);
    assert.equal((await generate()).body.created_count, 0);

    const saved = await request(`/api/stays/${newStay.id}/rent-dues`);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.data.length, 1);
    assert.equal(saved.body.data[0].due_month, payload.dueMonth);
    assert.equal(saved.body.data[0].due_date, payload.dueDate);
    assert.equal(Number(saved.body.data[0].amount_paise), 900000);

    const prior = await request(`/api/stays/${stayId}/rent-dues`);
    const manualDue = prior.body.data.find((due) => due.id === existing.body.id);
    assert.equal(manualDue.due_date, dates.manual_due_date);
    assert.equal(Number(manualDue.amount_paise), 130000);
});

test("automatic rent starts on day 30 and bills every 30 days even within one calendar month", { skip: shouldSkip }, async () => {
    const { rows: [dates] } = await pool.query(
        `WITH period AS (
            SELECT (date_trunc('year', CURRENT_DATE::timestamp) - INTERVAL '1 year')::date AS first_due
         )
         SELECT to_char(first_due - 30, 'YYYY-MM-DD') AS move_in,
                to_char(first_due - 1, 'YYYY-MM-DD') AS day_29,
                to_char(first_due, 'YYYY-MM-DD') AS day_30,
                to_char(first_due + 30, 'YYYY-MM-DD') AS day_60
         FROM period`
    );
    const { rows: [tenant] } = await pool.query(
        "INSERT INTO tenants (organization_id, name, phone) VALUES ($1, 'Cycle Tenant', '555-901-2001') RETURNING id",
        [organizationId]
    );
    const { rows: [bed] } = await pool.query(
        `INSERT INTO beds (room_id, bed_number)
         SELECT r.id, 'Cycle Bed'
         FROM beds b JOIN rooms r ON r.id = b.room_id JOIN floors f ON f.id = r.floor_id
         WHERE f.property_id = $1 AND b.bed_number = 'Spare' RETURNING id`,
        [propertyId]
    );
    const { rows: [stay] } = await pool.query(
        "INSERT INTO stays (organization_id, tenant_id, bed_id, move_in_date) VALUES ($1, $2, $3, $4) RETURNING id",
        [organizationId, tenant.id, bed.id, dates.move_in]
    );
    await pool.query(
        "INSERT INTO stay_rate_plans (stay_id, effective_from, monthly_rent_paise) VALUES ($1, $2, 900000)",
        [stay.id, dates.move_in]
    );
    const { createJobHandlers } = require("../jobs/handlers");
    const generate = createJobHandlers()["generate-rent"];
    const run = (runDate) => generate({ runDate });
    const dues = async () => (await request(`/api/stays/${stay.id}/rent-dues?sortBy=due_date`)).body.data;
    await run(dates.day_29);
    assert.deepEqual(await dues(), []);
    await run(dates.day_30);
    assert.deepEqual((await dues()).map((due) => [due.billing_cycle, due.due_date]), [[1, dates.day_30]]);
    await run(dates.day_60);
    await run(dates.day_60);
    const billed = await dues();
    assert.deepEqual(billed.map((due) => [due.billing_cycle, due.due_date]), [[1, dates.day_30], [2, dates.day_60]]);
    assert.equal(billed[0].due_month, billed[1].due_month);
    assert.ok(billed.every((due) => Number(due.amount_paise) === 900000));
});
