export function defaultEquals(a: unknown, b: unknown): boolean {
    return Object.is(a, b);
}

export function shallowEqual(oldValue: readonly unknown[], newValue: readonly unknown[]): boolean {
    if (oldValue === newValue) {
        return true;
    }
    return (
        oldValue.length === newValue.length &&
        oldValue.every((v, i) => defaultEquals(v, newValue[i]))
    );
}
