export function handleError(error: unknown, context: string = ""): void {
  console.error(`[${context}]:`, error);
  // Optionally, show a user notification if needed
}