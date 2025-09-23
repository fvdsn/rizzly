export class Ok<T> {
    readonly ok: true;
    readonly value: T;
    constructor(value: T) {
        this.ok = true;
        this.value = value;
    }
    unwrap(): T {
        return this.value;
    }
    unwrapOr<U>(value: U): T | U {
        return this.value;
    }
    map<U>(fn: (value: T) => U): Ok<U> {
        return ok(fn(this.value));
    }
    mapOr<U>(value: never, fn: (value: T) => U): Ok<U> {
        return ok(fn(this.value));
    }
    mapError<F extends string>(fn: (error: never) => F): Ok<T> {
        return this;
    }
    asError<F extends string>(err: F): Ok<T> {
        return this;
    }
    match<U>(handlers: { ok: (value: T) => U; err: (error: never, cause?: Error) => U }): U {
        return handlers.ok(this.value);
    }
}

export class Err<E extends string> {
    readonly ok: false;
    readonly error: E;
    readonly cause?: Error;
    constructor(error: E, cause?: Error) {
        this.ok = false;
        this.error = error;
        this.cause = cause;
    }
    unwrap(): never {
        if (this.cause) {
            throw new Error(this.error, { cause: this.cause });
        } else {
            throw new Error(this.error);
        }
    }
    unwrapOr<U>(value: U): U {
        return value;
    }
    map<U>(fn: (value: never) => U): Err<E> {
        return this;
    }
    mapOr<U>(value: U, fn: (value: never) => U): Ok<U> {
        return ok(value);
    }
    mapError<F extends string>(fn: (error: E) => F): Err<F> {
        return new Err(fn(this.error), this.cause);
    }
    asError<F extends string>(err: F): Err<F> {
        return new Err(err, this.cause);
    }
    match<U>(handlers: { ok: (value: never) => U; err: (error: E, cause?: Error) => U }): U {
        return handlers.err(this.error, this.cause);
    }
}

export class ErrWithCause<E extends string, C> {
    readonly ok: false;
    readonly error: E;
    readonly cause: C;
    constructor(error: E, cause: C) {
        this.ok = false;
        this.error = error;
        this.cause = cause;
    }
    unwrap(): never {
        if (this.cause) {
            throw new Error(this.error, { cause: this.cause });
        } else {
            throw new Error(this.error);
        }
    }
    unwrapOr<U>(value: U): U {
        return value;
    }
    map<U>(fn: (value: never) => U): ErrWithCause<E, C> {
        return this;
    }
    mapOr<U>(value: U, fn: (value: never) => U): Ok<U> {
        return ok(value);
    }
    mapError<F extends string>(fn: (error: E) => F): ErrWithCause<F, C> {
        return new ErrWithCause(fn(this.error), this.cause);
    }
    asError<F extends string>(err: F): ErrWithCause<F, C> {
        return new ErrWithCause(err, this.cause);
    }
    match<U>(handlers: { ok: (value: never) => U; err: (error: E, cause?: C) => U }): U {
        return handlers.err(this.error, this.cause);
    }
}

export type Result<T, E extends string> = Ok<T> | Err<E>;
export type CauseResult<T, E extends string, C> = Ok<T> | ErrWithCause<E, C>;
export type VoidResult<E extends string> = Ok<undefined> | Err<E>;

export function ok(): Ok<undefined>;
export function ok<T>(value: T): Ok<T>;
export function ok<T>(value?: T): Ok<T> {
    /* Shorthand helper function to return the succesfull value */
    return new Ok(value as T);
}

export function error<E extends string>(error: E, cause?: Error): Err<E>;
export function error<E extends string, C>(error: E, cause: C): ErrWithCause<E, C>;
export function error<E extends string, C>(error: E, cause?: C): Err<E> | ErrWithCause<E, C> {
    /* Shorthand helper function to return the error */
    if (typeof cause === "undefined") {
        return new Err(error);
    } else if (cause instanceof Error) {
        return new Err(error, cause);
    } else {
        return new ErrWithCause(error, cause);
    }
}

/*
export function unwrap<T>(res: Result<T, string>): T {
    /* gets the value out of a resut and throw and exception on error /
    if (res.ok) {
        return res.value;
    } else if (res.cause) {
        throw res.cause;
    } else {
        throw Error(res.error);
    }
}*/

export function wrap<T, E extends string>(errorStr: E, body: () => T): Result<T, E> {
    /* wraps a callback that can throw an exception into a result type */
    try {
        return ok(body());
    } catch (err) {
        if (err instanceof Error) {
            return error(errorStr, err);
        } else {
            return error(errorStr);
        }
    }
}

export async function awrap<T, E extends string>(
    errorStr: E,
    value: Promise<T>,
): Promise<Result<T, E>> {
    /* wraps a promise into a promise of a result type */
    try {
        return ok(await value);
    } catch (err) {
        if (err instanceof Error) {
            return error(errorStr, err);
        } else {
            return error(errorStr);
        }
    }
}
