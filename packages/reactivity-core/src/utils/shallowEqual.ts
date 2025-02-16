export function shallowEqual(oldValue: readonly unknown[], newValue: readonly unknown[]): boolean {
    if (oldValue === newValue) {
        return true;
    }
    return oldValue.length === newValue.length && oldValue.every((v, i) => v === newValue[i]);
}
