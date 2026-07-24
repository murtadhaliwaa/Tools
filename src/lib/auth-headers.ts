/** هيدرات يمرّرها Middleware إلى RSC لتفادي استدعاء getUser مرتين */
export const USER_HEADER = {
  id: "x-user-id",
  email: "x-user-email",
  name: "x-user-name",
} as const;
