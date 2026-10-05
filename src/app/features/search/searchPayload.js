export function requireArrayField(payload, field) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload[field])) {
    throw new Error("malformed_source_payload");
  }
  return payload[field];
}

export function requireHhPayload(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.items) ||
    !Number.isInteger(payload.page) ||
    !Number.isInteger(payload.pages) ||
    payload.page < 0 ||
    payload.pages < 0 ||
    (payload.pages > 0 && payload.page >= payload.pages)
  ) {
    throw new Error("malformed_source_payload");
  }
  return payload;
}
