const { z } = require("zod");
const { ApiError } = require("./apiError");

const baseListQuery = {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
};

function listQuerySchema({ sortFields, filters = {}, requiredFilters = [] }) {
    const shape = { ...baseListQuery, ...filters };
    for (const key of requiredFilters) {
        if (shape[key]?.isOptional?.()) shape[key] = shape[key].unwrap();
    }
    return z.object(shape).strict().superRefine((query, context) => {
        if (query.sortBy && !sortFields.includes(query.sortBy)) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["sortBy"],
                message: `sortBy must be one of: ${sortFields.join(", ")}`,
            });
        }
    }).transform((query) => ({
        ...query,
        sortBy: query.sortBy || sortFields[0],
    }));
}

async function paginateQuery(pool, {
    select,
    fromWhere,
    values,
    page = 1,
    limit = 25,
    sortColumns,
    sortBy = Object.keys(sortColumns)[0],
    sortOrder = "asc",
    tieColumn = "id",
}) {
    const sortColumn = sortColumns[sortBy];
    if (!sortColumn) {
        throw new ApiError(400, "INVALID_SORT", "Requested sort field is not supported");
    }
    const offset = (page - 1) * limit;
    const [dataResult, countResult] = await Promise.all([
        pool.query(
            `${select} ${fromWhere}
             ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}, ${tieColumn} ASC
             LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
            [...values, limit, offset]
        ),
        pool.query(`SELECT COUNT(*)::int AS total ${fromWhere}`, values),
    ]);
    const total = countResult.rows[0].total;
    return {
        data: dataResult.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

module.exports = { listQuerySchema, paginateQuery };
