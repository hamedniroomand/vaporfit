/** An error caused by the input of the user or by a data file, reported without a stack trace. */
export class VaporfitError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'VaporfitError';
  }
}
