const { z } = require("zod");
const { listQuerySchema } = require("./pagination");

const id = z.string().regex(/^[1-9]\d*$/, "Must be a positive integer");
const nonEmpty = (max = 150) => z.string().trim().min(1).max(max);
const email = z.string().trim().email().max(150);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Must be a valid YYYY-MM-DD date");
const positiveInt = z.number().int().positive();
const amountPaise = positiveInt.max(Number.MAX_SAFE_INTEGER);

const request = ({ params, query, body, headers } = {}) => z.object({
    params: params || z.object({}).passthrough(),
    query: query || z.object({}).passthrough(),
    body: body || z.object({}).passthrough(),
    headers: headers || z.object({}).passthrough(),
});
const idParams = (name = "id") => request({
    params: z.object({ [name]: id }).passthrough(),
    body: z.object({}).strict(),
});

const schemas = {
    authRegister: request({
        body: z.object({
            name: nonEmpty(100),
            email,
            password: z.string().min(8).max(128),
            organizationName: nonEmpty(100),
        }).strict(),
    }),
    authLogin: request({
        body: z.object({ email, password: z.string().min(1).max(128) }).strict(),
    }),
    tenantLogin: request({
        body: z.object({
            identifier: nonEmpty(150),
            password: z.string().min(1).max(128),
        }).strict(),
    }),
    tenantPasswordSetup: request({
        body: z.object({
            invitationToken: z.string().min(20).max(256),
            newPassword: z.string().min(8).max(128),
        }).strict(),
    }),
    organizationUpdate: request({
        params: z.object({ id }).passthrough(),
        body: z.object({ name: nonEmpty(100) }).strict(),
    }),
    propertyCreate: request({ body: z.object({ name: nonEmpty(100) }).strict() }),
    propertyUpdate: request({
        params: z.object({ id }).passthrough(),
        body: z.object({ name: nonEmpty(100) }).strict(),
    }),
    floorCreate: request({
        body: z.object({ propertyId: z.coerce.number().int().positive(), name: nonEmpty(50) }).strict(),
    }),
    roomCreate: request({
        body: z.object({
            floorId: z.coerce.number().int().positive(),
            room_number: nonEmpty(20),
            room_type: z.string().trim().max(50).nullable().optional(),
        }).strict(),
    }),
    bedCreate: request({
        body: z.object({
            roomId: z.coerce.number().int().positive(),
            bed_number: nonEmpty(20),
        }).strict(),
    }),
    bedStatus: request({
        params: z.object({ id }).passthrough(),
        body: z.object({ status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE"]) }).strict(),
    }),
    floorUpdate: request({
        params: z.object({ id }).passthrough(),
        body: z.object({ name: nonEmpty(50) }).strict(),
    }),
    roomUpdate: request({
        params: z.object({ id }).passthrough(),
        body: z.object({
            room_number: nonEmpty(20),
            room_type: z.string().trim().max(50).nullable().optional(),
        }).strict(),
    }),
    tenantCreate: request({
        body: z.object({
            name: nonEmpty(100),
            phone: nonEmpty(20),
            email: email.nullable().optional(),
        }).strict(),
    }),
    tenantUpdate: request({
        params: z.object({ id }).passthrough(),
        body: z.object({
            name: nonEmpty(100),
            phone: nonEmpty(20),
            email: email.nullable().optional(),
        }).strict(),
    }),
    stayCreate: request({
        body: z.object({
            tenantId: z.coerce.number().int().positive(),
            bedId: z.coerce.number().int().positive(),
            moveInDate: isoDate,
            monthly_rent_paise: amountPaise,
        }).strict(),
    }),
    stayUpdate: request({
        params: z.object({ id }).passthrough(),
        body: z.object({ moveInDate: isoDate }).strict(),
    }),
    checkout: request({
        params: z.object({ id }).passthrough(),
        body: z.object({ moveOutDate: isoDate.optional() }).strict(),
    }),
    ratePlan: request({
        params: z.object({ id }).passthrough(),
        body: z.object({ effectiveFrom: isoDate, monthly_rent_paise: amountPaise }).strict(),
    }),
    rentDueCreate: request({
        body: z.object({
            stayId: z.coerce.number().int().positive(),
            dueMonth: isoDate,
            amount_paise: amountPaise,
            dueDate: isoDate,
        }).strict(),
    }),
    rentDueGenerate: request({
        body: z.object({
            dueMonth: isoDate,
            amount_paise: amountPaise,
            dueDate: isoDate,
        }).strict(),
    }),
    paymentCreate: request({
        body: z.object({
            rentDueId: z.coerce.number().int().positive(),
            amount_paise: amountPaise,
            payment_method: z.string().trim().min(1).max(30).optional(),
            reference: z.string().trim().max(100).nullable().optional(),
        }).strict(),
        headers: z.object({
            "idempotency-key": z.string().regex(/^[A-Za-z0-9._:-]{16,128}$/),
        }).passthrough(),
    }),
    depositCreate: request({
        body: z.object({
            stayId: z.coerce.number().int().positive(),
            transactionType: z.enum(["COLLECT", "REFUND"]),
            amount_paise: amountPaise,
            transactionDate: isoDate.optional(),
            note: z.string().trim().max(255).nullable().optional(),
        }).strict(),
        headers: z.object({
            "idempotency-key": z.string().regex(/^[A-Za-z0-9._:-]{16,128}$/),
        }).passthrough(),
    }),
    tenantInvite: request({
        params: z.object({ id }).passthrough(),
        body: z.object({ purpose: z.enum(["INVITE", "PASSWORD_RESET"]).optional() }).strict(),
    }),
    empty: request({ body: z.object({}).strict() }),
    organizationList: request({
        query: listQuerySchema({ sortFields: ["id", "name", "created_at"], filters: { search: z.string().trim().max(100).optional() } }),
    }),
    propertyList: request({
        query: listQuerySchema({ sortFields: ["id", "name", "created_at"], filters: { search: z.string().trim().max(100).optional() } }),
    }),
    floorList: request({
        query: listQuerySchema({
            sortFields: ["id", "name", "created_at"],
            filters: { propertyId: z.coerce.number().int().positive(), search: z.string().trim().max(100).optional() },
            requiredFilters: ["propertyId"],
        }),
    }),
    roomList: request({
        query: listQuerySchema({
            sortFields: ["id", "room_number", "room_type", "created_at"],
            filters: { floorId: z.coerce.number().int().positive(), search: z.string().trim().max(100).optional(), room_type: z.string().trim().max(50).optional() },
            requiredFilters: ["floorId"],
        }),
    }),
    bedList: request({
        query: listQuerySchema({
            sortFields: ["id", "bed_number", "monthly_rent_paise", "status", "created_at"],
            filters: { roomId: z.coerce.number().int().positive(), status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE"]).optional() },
            requiredFilters: ["roomId"],
        }),
    }),
    tenantList: request({
        query: listQuerySchema({
            sortFields: ["id", "name", "phone", "email", "created_at"],
            filters: { search: z.string().trim().max(100).optional(), is_active: z.enum(["true", "false"]).optional() },
        }),
    }),
    stayList: request({
        query: listQuerySchema({
            sortFields: ["id", "move_in_date", "move_out_date", "created_at", "tenant_name", "property_name"],
            filters: {
                search: z.string().trim().max(100).optional(),
                tenantId: z.coerce.number().int().positive().optional(),
                active: z.enum(["true", "false"]).optional(),
            },
        }),
    }),
    dueList: request({
        params: z.object({ stayId: id }).passthrough(),
        query: listQuerySchema({
            sortFields: ["id", "due_month", "due_date", "amount_paise", "status"],
            filters: { status: z.enum(["DUE", "PARTIALLY_PAID", "PAID", "OVERDUE"]).optional() },
        }),
    }),
    paymentList: request({
        query: listQuerySchema({
            sortFields: ["id", "payment_date", "amount_paise", "payment_method"],
            filters: { rentDueId: z.coerce.number().int().positive() },
            requiredFilters: ["rentDueId"],
        }),
    }),
    depositList: request({
        query: listQuerySchema({
            sortFields: ["id", "transaction_date", "amount_paise", "transaction_type"],
            filters: { stayId: z.coerce.number().int().positive() },
            requiredFilters: ["stayId"],
        }),
    }),
    tenantPortalDueList: request({
        query: listQuerySchema({
            sortFields: ["id", "due_date", "due_month", "amount_paise", "status"],
            filters: { status: z.enum(["DUE", "PARTIALLY_PAID", "PAID", "OVERDUE"]).optional() },
        }),
    }),
    tenantPortalPaymentList: request({
        query: listQuerySchema({
            sortFields: ["id", "payment_date", "amount_paise", "payment_method"],
            filters: { payment_method: z.string().trim().max(30).optional() },
        }),
    }),
    tenantPortalDepositList: request({
        query: listQuerySchema({
            sortFields: ["id", "transaction_date", "amount_paise", "transaction_type"],
            filters: { transaction_type: z.enum(["COLLECT", "REFUND"]).optional() },
        }),
    }),
};

schemas.bedUpdate = idParams();
schemas.organizationDelete = idParams();
schemas.propertyDelete = idParams();
schemas.floorDelete = idParams();
schemas.roomDelete = idParams();
schemas.bedDelete = idParams();
schemas.tenantDelete = idParams();
schemas.tenantAuthToken = schemas.tenantInvite;
schemas.paymentReversal = request({
    params: z.object({ id }).passthrough(),
    body: z.object({
        amount_paise: amountPaise,
        reason: nonEmpty(255),
    }).strict(),
    headers: z.object({
        "idempotency-key": z.string().regex(/^[A-Za-z0-9._:-]{16,128}$/),
    }).passthrough(),
});

module.exports = { schemas, request, idParams, id, isoDate, amountPaise };
