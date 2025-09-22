export type Ok<T> = { ok: true; value: T };
export type Err<E extends string> = { ok: false; error: E; cause?: Error };
export type Result<T, E extends string> = Ok<T> | Err<E>;
export type VoidResult<E extends string> = Ok<undefined> | Err<E>;

export function ok(): Ok<undefined>;
export function ok<T>(value: T): Ok<T>;
export function ok<T>(value?: T): Ok<T> {
    /* Shorthand helper function to return the succesfull value */
    return { ok: true, value: value as T };
}

export function error<E extends string>(error: E, cause?: Error): Err<E> {
    /* Shorthand helper function to return the error */
    return { ok: false, error, cause };
}

export function unwrap<T>(res: Result<T, string>): T {
    /* gets the value out of a resut and throw and exception on error */
    if (res.ok) {
        return res.value;
    } else if (res.cause) {
        throw res.cause;
    } else {
        throw Error(res.error);
    }
}

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

export namespace Result {
    export function map<T, U, E extends string>(
        result: Result<T, E>,
        fn: (value: T) => U,
    ): Result<U, E> {
        return result.ok ? ok(fn(result.value)) : result;
    }

    export function flatMap<T, U, E extends string>(
        result: Result<T, E>,
        fn: (value: T) => Result<U, E>,
    ): Result<U, E> {
        return result.ok ? fn(result.value) : result;
    }

    export function mapError<T, E extends string, F extends string>(
        result: Result<T, E>,
        fn: (error: E, cause?: Error) => F,
    ): Result<T, F> {
        return result.ok ? result : error(fn(result.error, result.cause), result.cause);
    }

    export function match<T, E extends string, U>(
        result: Result<T, E>,
        handlers: { ok: (value: T) => U; err: (error: E, cause?: Error) => U },
    ): U {
        return result.ok ? handlers.ok(result.value) : handlers.err(result.error, result.cause);
    }
}
