import { NextRequest } from 'next/server';
import { drizzleDb } from '@/lib/db';
import { products } from '@/lib/schema';
import { getCachedData } from '@/lib/redis';
import { apiSuccess, handleApiError, handleValidationError } from '@/lib/api-utils';
import { withLogging } from '@/lib/api-middleware';
import { ProductSearchSchema } from '@/lib/validations';
import { eq, ilike, and, gte, lte, gt, or, asc, desc, count } from 'drizzle-orm';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());

    // Parse and validate search params
    const parseResult = ProductSearchSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const { q, category, minPrice, maxPrice, inStock, sortBy, order, page, limit } = parseResult.data;

    // Build cache key from search params
    const cacheKey = `products:search:${JSON.stringify({ q, category, minPrice, maxPrice, inStock, sortBy, order, page, limit })}`;

    const result = await getCachedData(
      cacheKey,
      60,
      async () => {
        // Build filter conditions
        const conditions = [];

        // Full-text search on name and description
        if (q) {
          const searchPattern = `%${q}%`;
          conditions.push(
            or(
              ilike(products.name, searchPattern),
              ilike(products.description, searchPattern)
            )
          );
        }

        // Category filter
        if (category) {
          conditions.push(eq(products.category, category));
        }

        // Price range filters
        if (minPrice !== undefined) {
          conditions.push(gte(products.price, minPrice));
        }
        if (maxPrice !== undefined) {
          conditions.push(lte(products.price, maxPrice));
        }

        // In-stock filter
        if (inStock) {
          conditions.push(gt(products.stock, 0));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Build sort order
        const getSortColumn = () => {
          if (sortBy === 'price') return products.price;
          if (sortBy === 'name') return products.name;
          return products.createdAt;
        };
        const sortColumn = getSortColumn();
        const sortOrder = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

        // Calculate offset
        const offset = (page - 1) * limit;

        // Execute queries in parallel
        const [items, totalResult] = await Promise.all([
          drizzleDb
            .select()
            .from(products)
            .where(whereClause)
            .orderBy(sortOrder)
            .limit(limit)
            .offset(offset),
          drizzleDb
            .select({ count: count() })
            .from(products)
            .where(whereClause),
        ]);

        const total = totalResult[0]?.count || 0;

        // Serialize dates to ISO strings
        const serializedItems = items.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }));

        return {
          products: serializedItems,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          },
        };
      },
      10
    );

    const response = apiSuccess(result);
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withLogging(handleGet);
