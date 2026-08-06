type LogFields = Record<string, unknown>;

function emit(
  level: "info" | "warn" | "error",
  message: string,
  fields?: LogFields,
) {
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** تسجيل بسيط منظم (JSON) — جاهز للربط لاحقاً بـ Sentry/Log drain */
export const logger = {
  info(message: string, fields?: LogFields) {
    emit("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    emit("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    emit("error", message, fields);
  },
};
