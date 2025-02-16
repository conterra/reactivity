let globalReportError: typeof globalThis["reportError"];
if (typeof globalThis.reportError === "function") {
    globalReportError = globalThis.reportError;
} else {
    globalReportError = (err: Error) => console.error(err);
}


// This function is being mocked in tests
export function reportTaskError(e: unknown) {
    globalReportError(new Error("Error in effect or watch callback", { cause: e }));
}
