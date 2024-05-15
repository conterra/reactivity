// This function is be mocked in tests
export function reportTaskError(e: unknown) {
    // This makes the error an unhandled rejection for lack of a better
    // reporting mechanisms. Stupid idea?
    Promise.reject(new Error(`Error in effect or watch callback`, { cause: e }));
}
