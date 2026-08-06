export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { assertServerEnv } = await import("@/lib/env");
  const { logger } = await import("@/lib/logger");

  try {
    assertServerEnv();
    logger.info("env.ok");
  } catch (error) {
    logger.error("env.invalid", {
      detail: error instanceof Error ? error.message : String(error),
    });
    // في البناء/التشغيل نفشل مبكراً بدل أعطال غامضة لاحقاً
    throw error;
  }
}
