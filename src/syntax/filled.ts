export function filled(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}
