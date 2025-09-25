import { ok, error, wrap, awrap, Result } from "../index";

function doSomething(succeeds: "succeeds" | "fails") {
    if (succeeds === "succeeds") {
        return ok(42);
    } else if (1 < 2) {
        return error("ERROR");
    } else {
        return error("ANOTHER_ERROR");
    }
}

describe("Result Types", () => {
    describe("ok()", () => {
        it("should accept no parameters", () => {
            const result = ok();
            expect(result.ok).toBe(true);
            expect(result.value).toBeUndefined();
        });
        it("should return a ok with the provided value", () => {
            const result = ok(42);
            expect(result.ok).toBe(true);
            expect(result.value).toBe(42);
        });

        it("should work with different types", () => {
            const stringResult = ok("hello");
            const objectResult = ok({ name: "test" });

            expect(stringResult.ok).toBe(true);
            expect(stringResult.value).toBe("hello");
            expect(objectResult.ok).toBe(true);
            expect(objectResult.value).toEqual({ name: "test" });
        });
    });

    describe("failure()", () => {
        it("should return a failure with the provided error type", () => {
            const result = error("NETWORK_ERROR");
            expect(result.ok).toBe(false);
            expect(result.error).toBe("NETWORK_ERROR");
            expect(result.cause).toBeUndefined();
        });

        it("should include message and error when provided", () => {
            const err = new Error("Connection failed");
            const result = error("NETWORK_ERROR", err);

            expect(result.ok).toBe(false);
            expect(result.error).toBe("NETWORK_ERROR");
            expect(result.cause).toBe(err);
        });
    });

    describe("wrap()", () => {
        it("should return success when callback does not throw", () => {
            const result = wrap("PARSE_ERROR", () => JSON.parse('{"valid": "json"}'));
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toEqual({ valid: "json" });
            }
        });

        it("should return failure when callback throws an Error", () => {
            const result = wrap("PARSE_ERROR", () => JSON.parse("invalid json"));
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe("PARSE_ERROR");
                expect(result.cause).toBeInstanceOf(SyntaxError);
            }
        });

        it("should return failure when callback throws a non-Error", () => {
            const result = wrap("CUSTOM_ERROR", () => {
                throw "string error";
            });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe("CUSTOM_ERROR");
                expect(result.cause).toBeUndefined();
            }
        });
    });

    describe("awrap()", () => {
        it("should return success when promise resolves", async () => {
            const result = await awrap("ASYNC_ERROR", Promise.resolve(42));
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toBe(42);
            }
        });

        it("should return failure when promise rejects with Error", async () => {
            const error = new Error("Async failed");
            const result = await awrap("ASYNC_ERROR", Promise.reject(error));
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe("ASYNC_ERROR");
                expect(result.cause).toBe(error);
            }
        });

        it("should return failure when promise rejects with non-Error", async () => {
            const result = await awrap("ASYNC_ERROR", Promise.reject("string error"));
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe("ASYNC_ERROR");
                expect(result.cause).toBeUndefined();
            }
        });
    });

    describe("Type checking", () => {
        it("should work with proper TypeScript types", () => {
            type MyError = "NETWORK_ERROR" | "PARSE_ERROR";
            const successResult: Result<number, MyError> = ok(42);
            const failureResult: Result<number, MyError> = error("NETWORK_ERROR");

            if (successResult.ok) {
                let value: number = successResult.value;
                expect(typeof successResult.value).toBe("number");
            }

            if (!failureResult.ok) {
                let failure: MyError = failureResult.error;
                expect(["NETWORK_ERROR", "PARSE_ERRROR"]).toContain(failureResult.error);
            }
        });

        it("Result type should be returnable from a function", () => {
            function doSomethingElse(): Result<number, "NETWORK_ERROR" | "PARSE_ERROR"> {
                if (42 < 55) {
                    return ok(42);
                } else {
                    return error("NETWORK_ERROR");
                }
            }

            expect(doSomethingElse().unwrap()).toBe(42);
        });

        it("VoidResult type should be returnable from a function", () => {
            function checkSomething(): Result<undefined, "NETWORK_ERROR" | "PARSE_ERROR"> {
                if (42 < 55) {
                    return ok();
                } else {
                    return error("NETWORK_ERROR");
                }
            }
            expect(checkSomething().unwrap()).toBeUndefined();
        });

        it("Types should be correctly inferred", () => {
            function doSomethingElse() {
                if (42 < 55) {
                    return ok(99);
                } else if (43 < 55) {
                    return error("NETWORK_ERROR");
                } else {
                    return error("PARSE_ERROR");
                }
            }

            let res: Result<number, "NETWORK_ERROR" | "PARSE_ERROR"> = doSomethingElse();
            expect(res.unwrap()).toBe(99);
        });
    });

    describe("Error with cause", () => {
        it("can be created from error()", () => {
            let res = error("VALIDATION_ERROR", { foo: "bar" });
            expect(res.ok).toBe(false);
            expect(res.cause.foo).toBe("bar");
        });

        it("can be inferred from a function", () => {
            function doSomethingElse() {
                if (42 > 99) {
                    return ok(42);
                } else {
                    return error("SOME_ERROR", { foo: "bar" });
                }
            }

            let res = doSomethingElse();

            if (res.ok) {
                expect(res.value).toBe(42);
            } else {
                expect(res.error).toBe("SOME_ERROR");
                expect(res.cause.foo).toBe("bar");
            }
        });

        it("can be inferred from a function mixed with regular errors", () => {
            function doSomethingElse() {
                if (42 > 99) {
                    return ok(42);
                } else if (43 > 99) {
                    return error("SOME_ERROR");
                } else {
                    return error("OTHER_ERROR", { foo: "bar" });
                }
            }

            let res = doSomethingElse();

            if (res.ok) {
                expect(res.value).toBe(42);
            } else if (res.error === "SOME_ERROR") {
                expect(res.error).toBe("SOME_ERROR");
                expect(res.cause).toBeUndefined();
            } else {
                expect(res.error).toBe("OTHER_ERROR");
                expect(res.cause.foo).toBe("bar");
            }
        });
    });

    describe("Results methods", () => {
        it("unwraps successes", () => {
            let res = doSomething("succeeds");
            expect(res.unwrap()).toBe(42);
        });

        it("unwraps failures", () => {
            let res = doSomething("fails");
            expect(() => res.unwrap()).toThrow("ERROR");
        });

        it("unwrapOrs successes", () => {
            let res = doSomething("succeeds");
            expect(res.unwrapOr(99)).toBe(42);
        });

        it("unwrapOrs failures", () => {
            let res = doSomething("fails");
            expect(res.unwrapOr(99)).toBe(99);
        });

        it("maps successes", () => {
            let res = doSomething("succeeds");
            expect(res.map((val) => val + 1).unwrap()).toBe(43);
        });

        it("maps failures", () => {
            let res = doSomething("fails");
            expect(() => res.map((val) => val + 1).unwrap()).toThrow("ERROR");
        });

        it("maps errors, when no errors", () => {
            let res = doSomething("succeeds");
            expect(res.mapError((err) => err.toLowerCase()).unwrap()).toBe(42);
        });

        it("maps errors, when errors", () => {
            let res = doSomething("fails");
            expect(() => res.mapError((err) => err.toLowerCase()).unwrap()).toThrow("error");
        });

        it("withError, when no errors", () => {
            let res = doSomething("succeeds").withError("NEW_ERROR");
            expect(res.unwrap()).toBe(42);
        });

        it("withError, when errors", () => {
            let res = doSomething("fails").withError("NEW_ERROR");
            expect(() => res.unwrap()).toThrow("NEW_ERROR");
        });

        it("match on success", () => {
            let res = doSomething("succeeds");
            const result = res.match({
                ok: (value) => `Success: ${value}`,
                err: (error, cause) => `Error: ${error}`,
            });
            expect(result).toBe("Success: 42");
        });

        it("match on failure", () => {
            let res = doSomething("fails");
            const result = res.match({
                ok: (value) => `Success: ${value}`,
                err: (error, cause) => `Error: ${error}`,
            });
            expect(result).toBe("Error: ERROR");
        });

        it("match on failure with cause", () => {
            const cause = new Error("Original error");
            let res = error("NETWORK_ERROR", cause);
            const result = res.match({
                ok: (value) => `Success: ${value}`,
                err: (error, cause) => `Error: ${error}, Cause: ${cause?.message}`,
            });
            expect(result).toBe("Error: NETWORK_ERROR, Cause: Original error");
        });

        it("match returns correct types", () => {
            let successRes = doSomething("succeeds");
            let failureRes = doSomething("fails");

            // Should return number when both handlers return numbers
            const numResult1 = successRes.match({
                ok: (value) => value * 2,
                err: (error) => 0,
            });
            expect(numResult1).toBe(84);

            const numResult2 = failureRes.match({
                ok: (value) => value * 2,
                err: (error) => 0,
            });
            expect(numResult2).toBe(0);
        });

        it("mapOr on success returns mapped value", () => {
            let res = doSomething("succeeds");
            expect(res.mapOr("default", (val) => `value: ${val}`).unwrap()).toBe("value: 42");
        });

        it("mapOr on failure returns default value", () => {
            let res = doSomething("fails");
            expect(res.mapOr("default", (val) => `value: ${val}`).unwrap()).toBe("default");
        });

        it("mapCause on success returns unchanged", () => {
            let res = doSomething("succeeds");
            expect(res.mapCause((cause) => `modified: ${cause}`).unwrap()).toBe(42);
        });

        it("mapCause on failure with cause transforms the cause", () => {
            const originalCause = new Error("original");
            let res = error("TEST_ERROR", originalCause);
            let mappedRes = res.mapCause((cause) => `modified: ${cause?.message}`);

            expect(mappedRes.ok).toBe(false);
            if (!mappedRes.ok) {
                expect(mappedRes.error).toBe("TEST_ERROR");
                expect(mappedRes.cause).toBe("modified: original");
            }
        });

        it("mapCause on failure without cause transforms undefined", () => {
            let res = error("TEST_ERROR");
            let mappedRes = res.mapCause((cause) => "new cause");

            expect(mappedRes.ok).toBe(false);
            if (!mappedRes.ok) {
                expect(mappedRes.error).toBe("TEST_ERROR");
                expect(mappedRes.cause).toBe("new cause");
            }
        });

        it("withErrorAndCause on success returns unchanged", () => {
            let res = doSomething("succeeds");
            expect(res.withErrorAndCause("NEW_ERROR", "new cause").unwrap()).toBe(42);
        });

        it("withErrorAndCause on failure changes both error and cause", () => {
            const originalCause = new Error("original");
            let res = error("ORIGINAL_ERROR", originalCause);
            let newRes = res.withErrorAndCause("NEW_ERROR", "new cause");

            expect(newRes.ok).toBe(false);
            if (!newRes.ok) {
                expect(newRes.error).toBe("NEW_ERROR");
                expect(newRes.cause).toBe("new cause");
            }
        });

        it("withErrorAndCause on failure without original cause", () => {
            let res = error("ORIGINAL_ERROR");
            let newRes = res.withErrorAndCause("NEW_ERROR", { custom: "cause" });

            expect(newRes.ok).toBe(false);
            if (!newRes.ok) {
                expect(newRes.error).toBe("NEW_ERROR");
                expect(newRes.cause).toEqual({ custom: "cause" });
            }
        });
    });

    describe("Ok class comprehensive tests", () => {
        describe("unwrap()", () => {
            it("should return value for different primitive types", () => {
                expect(ok(42).unwrap()).toBe(42);
                expect(ok("hello").unwrap()).toBe("hello");
                expect(ok(true).unwrap()).toBe(true);
                expect(ok(false).unwrap()).toBe(false);
                expect(ok(0).unwrap()).toBe(0);
                expect(ok("").unwrap()).toBe("");
            });

            it("should return value for complex types", () => {
                const obj = { a: 1, b: "test" };
                const arr = [1, 2, 3];
                const fn = () => "function result";

                expect(ok(obj).unwrap()).toEqual(obj);
                expect(ok(arr).unwrap()).toEqual(arr);
                expect(ok(fn).unwrap()()).toBe("function result");
            });

            it("should return null and undefined values correctly", () => {
                expect(ok(null).unwrap()).toBe(null);
                expect(ok(undefined).unwrap()).toBe(undefined);
                expect(ok().unwrap()).toBe(undefined);
            });
        });

        describe("unwrapOr()", () => {
            it("should always return the Ok value, never the default", () => {
                expect(ok(42).unwrapOr(99)).toBe(42);
                expect(ok("hello").unwrapOr("world")).toBe("hello");
                expect(ok(true).unwrapOr(false)).toBe(true);
                expect(ok(null).unwrapOr("default")).toBe(null);
                expect(ok(undefined).unwrapOr("default")).toBe(undefined);
            });

            it("should work with different default types", () => {
                const okNumber = ok(42);
                expect(okNumber.unwrapOr("string default")).toBe(42);
                expect(okNumber.unwrapOr({ default: "object" })).toBe(42);
                expect(okNumber.unwrapOr([1, 2, 3])).toBe(42);
            });
        });

        describe("map()", () => {
            it("should transform values with different functions", () => {
                expect(ok(5).map(x => x * 2).unwrap()).toBe(10);
                expect(ok("hello").map(s => s.toUpperCase()).unwrap()).toBe("HELLO");
                expect(ok([1, 2, 3]).map(arr => arr.length).unwrap()).toBe(3);
            });

            it("should handle transformation to different types", () => {
                expect(ok(42).map(x => `Number: ${x}`).unwrap()).toBe("Number: 42");
                expect(ok("5").map(s => parseInt(s)).unwrap()).toBe(5);
                expect(ok({ name: "test" }).map(obj => obj.name).unwrap()).toBe("test");
            });

            it("should be chainable", () => {
                const result = ok(10)
                    .map(x => x * 2)
                    .map(x => x + 1)
                    .map(x => x.toString());

                expect(result.unwrap()).toBe("21");
            });

            it("should handle functions that return null/undefined", () => {
                expect(ok(42).map(() => null).unwrap()).toBe(null);
                expect(ok(42).map(() => undefined).unwrap()).toBe(undefined);
            });
        });

        describe("mapOr()", () => {
            it("should always apply the function, ignoring default value", () => {
                expect(ok(10).mapOr(999, x => x * 2).unwrap()).toBe(20);
                expect(ok("hello").mapOr("default", s => s.toUpperCase()).unwrap()).toBe("HELLO");
            });

            it("should work with different default and transformation types", () => {
                expect(ok(42).mapOr("string default", x => `Number: ${x}`).unwrap()).toBe("Number: 42");
                expect(ok("test").mapOr(0, s => s.length).unwrap()).toBe(4);
            });

            it("should handle transformation that returns same type as default", () => {
                expect(ok(5).mapOr(100, x => x * 10).unwrap()).toBe(50);
            });
        });

        describe("mapError()", () => {
            it("should return same Ok instance unchanged", () => {
                const original = ok(42);
                const mapped = original.mapError((err: string) => err.toUpperCase());

                expect(mapped).toBe(original);
                expect(mapped.unwrap()).toBe(42);
            });

            it("should work with any error transformation function", () => {
                const result = ok("test").mapError((err: string) => `PREFIX_${err}`);
                expect(result.unwrap()).toBe("test");
            });
        });

        describe("mapCause()", () => {
            it("should return same Ok instance unchanged", () => {
                const original = ok(42);
                const mapped = original.mapCause((cause: any) => `Modified: ${cause}`);

                expect(mapped).toBe(original);
                expect(mapped.unwrap()).toBe(42);
            });

            it("should work with any cause transformation function", () => {
                const result = ok("test").mapCause((cause: Error) => new Error("new cause"));
                expect(result.unwrap()).toBe("test");
            });
        });

        describe("withError()", () => {
            it("should return same Ok instance unchanged", () => {
                const original = ok(42);
                const withError = original.withError("NEW_ERROR");

                expect(withError).toBe(original);
                expect(withError.unwrap()).toBe(42);
            });

            it("should work with different error types", () => {
                expect(ok("test").withError("VALIDATION_ERROR").unwrap()).toBe("test");
                expect(ok(123).withError("NUMERIC_ERROR").unwrap()).toBe(123);
            });
        });

        describe("withErrorAndCause()", () => {
            it("should return same Ok instance unchanged", () => {
                const original = ok(42);
                const withBoth = original.withErrorAndCause("NEW_ERROR", "new cause");

                expect(withBoth).toBe(original);
                expect(withBoth.unwrap()).toBe(42);
            });

            it("should work with different error and cause types", () => {
                expect(ok("test").withErrorAndCause("ERROR", new Error("cause")).unwrap()).toBe("test");
                expect(ok(123).withErrorAndCause("ERROR", { custom: "cause" }).unwrap()).toBe(123);
            });
        });

        describe("match()", () => {
            it("should always call ok handler with the value", () => {
                const okSpy = jest.fn(val => `ok: ${val}`);
                const errSpy = jest.fn();

                const result = ok(42).match({
                    ok: okSpy,
                    err: errSpy
                });

                expect(result).toBe("ok: 42");
                expect(okSpy).toHaveBeenCalledWith(42);
                expect(errSpy).not.toHaveBeenCalled();
            });

            it("should work with different return types from handlers", () => {
                expect(ok(5).match({
                    ok: val => val * 2,
                    err: () => 0
                })).toBe(10);

                expect(ok("hello").match({
                    ok: val => ({ message: val }),
                    err: () => ({ message: "error" })
                })).toEqual({ message: "hello" });
            });

            it("should handle complex transformations", () => {
                const result = ok([1, 2, 3]).match({
                    ok: arr => arr.reduce((sum, n) => sum + n, 0),
                    err: () => -1
                });

                expect(result).toBe(6);
            });
        });
    });

    describe("Err class comprehensive tests", () => {
        describe("unwrap()", () => {
            it("should throw Error with message when no cause", () => {
                const err = error("TEST_ERROR");

                expect(() => err.unwrap()).toThrow("TEST_ERROR");
                expect(() => err.unwrap()).toThrow(Error);
            });

            it("should throw Error with cause when cause provided", () => {
                const originalError = new Error("Original cause");
                const err = error("TEST_ERROR", originalError);

                let thrownError: Error | undefined;
                try {
                    err.unwrap();
                } catch (e) {
                    thrownError = e as Error;
                }

                expect(thrownError).toBeInstanceOf(Error);
                expect(thrownError?.message).toBe("TEST_ERROR");
                expect(thrownError?.cause).toBe(originalError);
            });

            it("should handle different cause types", () => {
                const stringErr = error("ERROR", "string cause");
                const objectErr = error("ERROR", { custom: "object" });
                const numberErr = error("ERROR", 404);

                expect(() => stringErr.unwrap()).toThrow("ERROR");
                expect(() => objectErr.unwrap()).toThrow("ERROR");
                expect(() => numberErr.unwrap()).toThrow("ERROR");

                try {
                    objectErr.unwrap();
                } catch (e) {
                    expect((e as Error).cause).toEqual({ custom: "object" });
                }
            });
        });

        describe("unwrapOr()", () => {
            it("should always return the default value", () => {
                expect(error("ERROR").unwrapOr(42)).toBe(42);
                expect(error("ERROR").unwrapOr("default")).toBe("default");
                expect(error("ERROR").unwrapOr(null)).toBe(null);
                expect(error("ERROR").unwrapOr(undefined)).toBe(undefined);
            });

            it("should work with complex default types", () => {
                const defaultObj = { a: 1, b: "test" };
                const defaultArr = [1, 2, 3];
                const defaultFn = () => "result";

                expect(error("ERROR").unwrapOr(defaultObj)).toEqual(defaultObj);
                expect(error("ERROR").unwrapOr(defaultArr)).toEqual(defaultArr);
                expect(error("ERROR").unwrapOr(defaultFn)()).toBe("result");
            });

            it("should ignore error and cause, always return default", () => {
                const causeErr = error("ERROR", new Error("cause"));
                const stringCauseErr = error("ERROR", "string cause");

                expect(causeErr.unwrapOr("default")).toBe("default");
                expect(stringCauseErr.unwrapOr(999)).toBe(999);
            });
        });

        describe("map()", () => {
            it("should return same Err instance unchanged", () => {
                const original = error("TEST_ERROR");
                const mapped = original.map((val: any) => val * 2);

                expect(mapped).toBe(original);
                expect(mapped.error).toBe("TEST_ERROR");
                expect(() => mapped.unwrap()).toThrow("TEST_ERROR");
            });

            it("should preserve error and cause through map operations", () => {
                const originalCause = new Error("original");
                const original = error("TEST_ERROR", originalCause);
                const mapped = original.map((val: any) => `transformed: ${val}`);

                expect(mapped).toBe(original);
                expect(mapped.error).toBe("TEST_ERROR");
                expect(mapped.cause).toBe(originalCause);
            });

            it("should be chainable but always return same instance", () => {
                const original = error("ERROR");
                const chained = original
                    .map((x: any) => x * 2)
                    .map((x: any) => x.toString())
                    .map((x: any) => x.toUpperCase());

                expect(chained).toBe(original);
                expect(chained.error).toBe("ERROR");
            });
        });

        describe("mapOr()", () => {
            it("should always return Ok with default value", () => {
                const result1 = error("ERROR").mapOr("default", (val: any) => val.toString());
                const result2 = error("ERROR", "cause").mapOr(42, (val: any) => val * 2);

                expect(result1.ok).toBe(true);
                expect(result1.unwrap()).toBe("default");

                expect(result2.ok).toBe(true);
                expect(result2.unwrap()).toBe(42);
            });

            it("should ignore the transformation function completely", () => {
                const transformSpy = jest.fn();
                const result = error("ERROR").mapOr("default", transformSpy);

                expect(result.ok).toBe(true);
                expect(result.unwrap()).toBe("default");
                expect(transformSpy).not.toHaveBeenCalled();
            });

            it("should work with different default types", () => {
                expect(error("ERROR").mapOr({ obj: "default" }, (x: any) => x).unwrap())
                    .toEqual({ obj: "default" });
                expect(error("ERROR").mapOr([1, 2, 3], (x: any) => x).unwrap())
                    .toEqual([1, 2, 3]);
            });
        });

        describe("mapError()", () => {
            it("should transform the error string", () => {
                const original = error("test_error");
                const mapped = original.mapError((err: string) => err.toUpperCase());

                expect(mapped.ok).toBe(false);
                expect(mapped.error).toBe("TEST_ERROR");
                expect(mapped.cause).toBe(undefined);
            });

            it("should preserve the cause when transforming error", () => {
                const originalCause = new Error("original cause");
                const original = error("test_error", originalCause);
                const mapped = original.mapError((err: string) => `prefix_${err}`);

                expect(mapped.ok).toBe(false);
                expect(mapped.error).toBe("prefix_test_error");
                expect(mapped.cause).toBe(originalCause);
            });

            it("should handle different error transformations", () => {
                const err = error("validation_failed");

                expect(err.mapError(e => e.replace("_", " ")).error).toBe("validation failed");
                expect(err.mapError(e => `ERROR: ${e}`).error).toBe("ERROR: validation_failed");
                expect(err.mapError(e => e.substring(0, 5)).error).toBe("valid");
            });

            it("should be chainable", () => {
                const result = error("test")
                    .mapError(e => e.toUpperCase())
                    .mapError(e => `PREFIX_${e}`)
                    .mapError(e => `${e}_SUFFIX`);

                expect(result.error).toBe("PREFIX_TEST_SUFFIX");
            });
        });

        describe("mapCause()", () => {
            it("should transform the cause while preserving error", () => {
                const originalCause = new Error("original");
                const err = error("TEST_ERROR", originalCause);
                const mapped = err.mapCause((cause: Error) => `transformed: ${cause.message}`);

                expect(mapped.ok).toBe(false);
                expect(mapped.error).toBe("TEST_ERROR");
                expect(mapped.cause).toBe("transformed: original");
            });

            it("should handle undefined cause transformation", () => {
                const err = error("TEST_ERROR");
                const mapped = err.mapCause((cause: undefined) => "new cause");

                expect(mapped.ok).toBe(false);
                expect(mapped.error).toBe("TEST_ERROR");
                expect(mapped.cause).toBe("new cause");
            });

            it("should handle different cause types and transformations", () => {
                const stringCause = error("ERROR", "string cause");
                const objectCause = error("ERROR", { type: "object" });
                const numberCause = error("ERROR", 404);

                expect(stringCause.mapCause(c => c.toUpperCase()).cause).toBe("STRING CAUSE");
                expect(objectCause.mapCause(c => c.type).cause).toBe("object");
                expect(numberCause.mapCause(c => c * 2).cause).toBe(808);
            });

            it("should be chainable", () => {
                const originalCause = { value: 10 };
                const result = error("ERROR", originalCause)
                    .mapCause(c => ({ value: c.value * 2 }))
                    .mapCause(c => ({ value: c.value + 5 }))
                    .mapCause(c => c.value.toString());

                expect(result.cause).toBe("25");
                expect(result.error).toBe("ERROR");
            });
        });

        describe("withError()", () => {
            it("should replace error while preserving cause", () => {
                const originalCause = new Error("original");
                const original = error("OLD_ERROR", originalCause);
                const newErr = original.withError("NEW_ERROR");

                expect(newErr.ok).toBe(false);
                expect(newErr.error).toBe("NEW_ERROR");
                expect(newErr.cause).toBe(originalCause);
            });

            it("should work with no cause", () => {
                const original = error("OLD_ERROR");
                const newErr = original.withError("NEW_ERROR");

                expect(newErr.error).toBe("NEW_ERROR");
                expect(newErr.cause).toBe(undefined);
            });

            it("should create new instance, not modify original", () => {
                const original = error("ORIGINAL", "cause");
                const modified = original.withError("MODIFIED");

                expect(original.error).toBe("ORIGINAL");
                expect(modified.error).toBe("MODIFIED");
                expect(modified.cause).toBe("cause");
            });
        });

        describe("withErrorAndCause()", () => {
            it("should replace both error and cause", () => {
                const original = error("OLD_ERROR", "old cause");
                const newErr = original.withErrorAndCause("NEW_ERROR", "new cause");

                expect(newErr.ok).toBe(false);
                expect(newErr.error).toBe("NEW_ERROR");
                expect(newErr.cause).toBe("new cause");
            });

            it("should work with different cause types", () => {
                const original = error("OLD_ERROR");

                const withString = original.withErrorAndCause("ERROR1", "string cause");
                const withObject = original.withErrorAndCause("ERROR2", { custom: true });
                const withError = original.withErrorAndCause("ERROR3", new Error("error cause"));

                expect(withString.cause).toBe("string cause");
                expect(withObject.cause).toEqual({ custom: true });
                expect(withError.cause).toBeInstanceOf(Error);
            });

            it("should create new instance, not modify original", () => {
                const original = error("ORIGINAL", "original cause");
                const modified = original.withErrorAndCause("MODIFIED", "modified cause");

                expect(original.error).toBe("ORIGINAL");
                expect(original.cause).toBe("original cause");
                expect(modified.error).toBe("MODIFIED");
                expect(modified.cause).toBe("modified cause");
            });
        });

        describe("match()", () => {
            it("should always call err handler with error and cause", () => {
                const okSpy = jest.fn();
                const errSpy = jest.fn((error, cause) => `Error: ${error}, Cause: ${cause}`);

                const result = error("TEST_ERROR", "test cause").match({
                    ok: okSpy,
                    err: errSpy
                });

                expect(result).toBe("Error: TEST_ERROR, Cause: test cause");
                expect(errSpy).toHaveBeenCalledWith("TEST_ERROR", "test cause");
                expect(okSpy).not.toHaveBeenCalled();
            });

            it("should handle undefined cause correctly", () => {
                const errSpy = jest.fn((error, cause) => ({ error, cause }));

                const result = error("TEST_ERROR").match({
                    ok: () => null,
                    err: errSpy
                });

                expect(result).toEqual({ error: "TEST_ERROR", cause: undefined });
                expect(errSpy).toHaveBeenCalledWith("TEST_ERROR", undefined);
            });

            it("should work with different return types from handlers", () => {
                expect(error("ERROR").match({
                    ok: () => 42,
                    err: (error) => error.length
                })).toBe(5);

                expect(error("ERROR", { count: 3 }).match({
                    ok: () => [],
                    err: (error, cause: any) => [error, cause.count]
                })).toEqual(["ERROR", 3]);
            });

            it("should handle complex error and cause transformations", () => {
                const complexCause = {
                    nested: { value: 42 },
                    array: [1, 2, 3]
                };

                const result = error("COMPLEX_ERROR", complexCause).match({
                    ok: () => "success",
                    err: (error, cause: any) => `Error: ${error}, Nested: ${cause.nested.value}, Sum: ${cause.array.reduce((a: number, b: number) => a + b, 0)}`
                });

                expect(result).toBe("Error: COMPLEX_ERROR, Nested: 42, Sum: 6");
            });
        });
    });
});
