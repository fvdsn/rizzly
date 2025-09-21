export type Success<T> = { ok: true; value: T };
export type Failure<E extends string> = { ok: false; failure: E; message?: string; error?: Error };
export type Result<T, E extends string> = Success<T> | Failure<E>;
export type OkOrFailure<E extends string> = Success<undefined> | Failure<E>;

export function ok(): Success<undefined> {
    /* Shorthand helper function to return empty success */
    return { ok: true, value: undefined };
}

export function success<T>(value: T): Success<T> {
    /* Shorthand helper function to return the succesfull value */
    return { ok: true, value: value };
}

export function failure<E extends string>(failure: E, message?: string, error?: Error): Failure<E> {
    /* Shorthand helper function to return the error */
    return { ok: false, failure: failure, message: message, error: error };
}

export function unwrap<T>(res: Result<T, string>): T {
    /* gets the value out of a resut and throw and exception on error */
    if (res.ok) {
        return res.value;
    } else {
        throw Error(res.failure);
    }
}

export function wrap<T, E extends string>(failureType: E, body: () => T): Result<T, E> {
    /* wraps a callback that can throw an exception into a result type */
    try {
        return success(body());
    } catch (err) {
        if (err instanceof Error) {
            return failure(failureType, `${err}`, err);
        } else {
            return failure(failureType, `${err}`);
        }
    }
}

export async function awrap<T, E extends string>(
    failureType: E,
    value: Promise<T>,
): Promise<Result<T, E>> {
    /* wraps a promise into a promise of a result type */
    try {
        return success(await value);
    } catch (err) {
        if (err instanceof Error) {
            return failure(failureType, `${err}`, err);
        } else {
            return failure(failureType, `${err}`);
        }
    }
}
