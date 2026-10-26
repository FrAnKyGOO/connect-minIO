export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
