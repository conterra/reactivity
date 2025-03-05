let globalReportError: (typeof globalThis)["reportError"];
if (typeof globalThis.reportError === "function") {
    globalReportError = globalThis.reportError;
} else {
    globalReportError = (err: Error) => console.error(err);
}

/**
 * Reports an error that occurred in a callback function, for example within an effect or a watch callback.
 *
 * @param error The error that occurred.
 * @param message An optional message to include in the error.
 *
 * @group Utilities
 */
export function reportCallbackError(error: unknown, message?: string): void {
    globalReportError(new Error(message ?? "Error in effect or watch callback", { cause: error }));
}
