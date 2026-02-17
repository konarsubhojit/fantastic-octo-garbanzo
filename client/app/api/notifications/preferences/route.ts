import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { drizzleDb } from '@/lib/db';
import { notificationPreferences } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, handleApiError, handleValidationError } from '@/lib/api-utils';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Zod schema for notification preferences
const NotificationPreferencesSchema = z.object({
  emailOrderUpdates: z.boolean(),
  emailPromotions: z.boolean(),
  emailPriceAlerts: z.boolean(),
  pushEnabled: z.boolean(),
});

type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;

// Default preferences (all true except pushEnabled)
const DEFAULT_PREFERENCES = {
  emailOrderUpdates: true,
  emailPromotions: true,
  emailPriceAlerts: true,
  pushEnabled: false,
};

// Helper: Convert database integers to booleans
function serializePreferences(prefs: {
  id: string;
  userId: string;
  emailOrderUpdates: number;
  emailPromotions: number;
  emailPriceAlerts: number;
  pushEnabled: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: prefs.id,
    userId: prefs.userId,
    emailOrderUpdates: prefs.emailOrderUpdates === 1,
    emailPromotions: prefs.emailPromotions === 1,
    emailPriceAlerts: prefs.emailPriceAlerts === 1,
    pushEnabled: prefs.pushEnabled === 1,
    createdAt: prefs.createdAt.toISOString(),
    updatedAt: prefs.updatedAt.toISOString(),
  };
}

// GET /api/notifications/preferences - Fetch user's notification preferences
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const prefs = await drizzleDb.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, session.user.id),
    });

    // If no preferences exist, return defaults
    if (!prefs) {
      return apiSuccess(DEFAULT_PREFERENCES);
    }

    return apiSuccess(serializePreferences(prefs));
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/notifications/preferences - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const parseResult = NotificationPreferencesSchema.safeParse(body);

    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const input: NotificationPreferencesInput = parseResult.data;

    // Check if preferences exist for this user
    const existingPrefs = await drizzleDb.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, session.user.id),
    });

    // Convert booleans to integers for database storage
    const dbValues = {
      emailOrderUpdates: input.emailOrderUpdates ? 1 : 0,
      emailPromotions: input.emailPromotions ? 1 : 0,
      emailPriceAlerts: input.emailPriceAlerts ? 1 : 0,
      pushEnabled: input.pushEnabled ? 1 : 0,
      updatedAt: new Date(),
    };

    let updatedPrefs;

    if (existingPrefs) {
      // Update existing preferences
      [updatedPrefs] = await drizzleDb
        .update(notificationPreferences)
        .set(dbValues)
        .where(eq(notificationPreferences.userId, session.user.id))
        .returning();
    } else {
      // Create new preferences
      [updatedPrefs] = await drizzleDb
        .insert(notificationPreferences)
        .values({
          userId: session.user.id,
          ...dbValues,
        })
        .returning();
    }

    return apiSuccess(serializePreferences(updatedPrefs));
  } catch (error) {
    return handleApiError(error);
  }
}
