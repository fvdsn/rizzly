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

    describe("Edge cases and type safety", () => {
        describe("Falsy value handling", () => {
            it("should handle falsy values correctly in Ok", () => {
                expect(ok(0).unwrap()).toBe(0);
                expect(ok("").unwrap()).toBe("");
                expect(ok(false).unwrap()).toBe(false);
                expect(ok(null).unwrap()).toBe(null);
                expect(ok(undefined).unwrap()).toBe(undefined);
                expect(ok(NaN).unwrap()).toBe(NaN);
            });

            it("should distinguish between falsy values and default in unwrapOr", () => {
                expect(ok(0).unwrapOr(99)).toBe(0);
                expect(ok("").unwrapOr("default")).toBe("");
                expect(ok(false).unwrapOr(true)).toBe(false);
                expect(ok(null).unwrapOr("not null")).toBe(null);

                expect(error("ERROR").unwrapOr(0)).toBe(0);
                expect(error("ERROR").unwrapOr("")).toBe("");
                expect(error("ERROR").unwrapOr(false)).toBe(false);
                expect(error("ERROR").unwrapOr(null)).toBe(null);
            });

            it("should handle falsy values in transformations", () => {
                expect(ok(0).map(x => x + 1).unwrap()).toBe(1);
                expect(ok("").map(s => s.length).unwrap()).toBe(0);
                expect(ok(false).map(b => !b).unwrap()).toBe(true);
                expect(ok(null).map(n => n === null).unwrap()).toBe(true);
            });
        });

        describe("Type coercion and strict equality", () => {
            it("should maintain strict equality for primitive values", () => {
                const okZero = ok(0);
                const okEmptyString = ok("");
                const okFalse = ok(false);

                expect(okZero.unwrap()).toBe(0);
                expect(okZero.unwrap()).not.toBe("0");
                expect(okZero.unwrap()).not.toBe(false);

                expect(okEmptyString.unwrap()).toBe("");
                expect(okEmptyString.unwrap()).not.toBe(0);
                expect(okEmptyString.unwrap()).not.toBe(false);

                expect(okFalse.unwrap()).toBe(false);
                expect(okFalse.unwrap()).not.toBe(0);
                expect(okFalse.unwrap()).not.toBe("");
            });

            it("should handle object reference equality", () => {
                const obj1 = { a: 1 };
                const obj2 = { a: 1 };
                const okObj1 = ok(obj1);

                expect(okObj1.unwrap()).toBe(obj1);
                expect(okObj1.unwrap()).not.toBe(obj2);
                expect(okObj1.unwrap()).toEqual(obj2);
            });
        });

        describe("Error message edge cases", () => {
            it("should handle empty error strings", () => {
                const err = error("");
                expect(err.error).toBe("");
                expect(() => err.unwrap()).toThrow("");
            });

            it("should handle very long error strings", () => {
                const longError = "A".repeat(1000);
                const err = error(longError);
                expect(err.error).toBe(longError);
                expect(err.error.length).toBe(1000);
            });

            it("should handle special characters in error strings", () => {
                const specialChars = "ERROR: \n\t\r\"'\\/@#$%^&*()[]{}|<>?";
                const err = error(specialChars);
                expect(err.error).toBe(specialChars);
                expect(() => err.unwrap()).toThrow(specialChars);
            });

            it("should handle unicode and emojis in error strings", () => {
                const unicodeError = "ERROR: 💥🚨 Unicode test 中文 русский 🔥";
                const err = error(unicodeError);
                expect(err.error).toBe(unicodeError);
                expect(() => err.unwrap()).toThrow(unicodeError);
            });
        });

        describe("Complex cause types", () => {
            it("should handle circular references in cause without infinite loops", () => {
                const circularObj: any = { name: "circular" };
                circularObj.self = circularObj;

                const err = error("CIRCULAR_ERROR", circularObj);
                expect(err.cause).toBe(circularObj);
                expect(err.cause.self).toBe(circularObj);

                // Should not cause infinite loop when accessing
                expect(err.cause.name).toBe("circular");
            });

            it("should handle deeply nested objects as cause", () => {
                const deepObj = {
                    level1: {
                        level2: {
                            level3: {
                                level4: {
                                    value: "deep value"
                                }
                            }
                        }
                    }
                };

                const err = error("DEEP_ERROR", deepObj);
                expect(err.cause.level1.level2.level3.level4.value).toBe("deep value");
            });

            it("should handle function as cause", () => {
                const causeFunction = () => "I am a cause function";
                const err = error("FUNCTION_ERROR", causeFunction);

                expect(typeof err.cause).toBe("function");
                expect(err.cause()).toBe("I am a cause function");
            });

            it("should handle class instances as cause", () => {
                class CustomError {
                    constructor(public message: string) {}
                    toString() {
                        return `CustomError: ${this.message}`;
                    }
                }

                const customErr = new CustomError("custom message");
                const err = error("CLASS_ERROR", customErr);

                expect(err.cause).toBeInstanceOf(CustomError);
                expect(err.cause.message).toBe("custom message");
                expect(err.cause.toString()).toBe("CustomError: custom message");
            });
        });

        describe("Memory and performance edge cases", () => {
            it("should handle very large arrays", () => {
                const largeArray = new Array(10000).fill(0).map((_, i) => i);
                const okArray = ok(largeArray);

                expect(okArray.unwrap().length).toBe(10000);
                expect(okArray.unwrap()[9999]).toBe(9999);

                const doubled = okArray.map(arr => arr.map(x => x * 2));
                expect(doubled.unwrap()[5000]).toBe(10000);
            });

            it("should handle multiple chained operations efficiently", () => {
                const result = ok(1)
                    .map(x => x + 1)
                    .map(x => x * 2)
                    .map(x => x + 3)
                    .map(x => x * 4)
                    .map(x => x + 5)
                    .map(x => x * 6)
                    .map(x => x + 7)
                    .map(x => x * 8)
                    .map(x => x + 9)
                    .map(x => x * 10);

                // ((((((((1 + 1) * 2 + 3) * 4 + 5) * 6 + 7) * 8 + 9) * 10) = 16490
                expect(result.unwrap()).toBe(16490);
            });

            it("should handle large error chains efficiently", () => {
                let err: any = error("INITIAL_ERROR", "cause");

                for (let i = 0; i < 100; i++) {
                    err = err
                        .mapError((e: string) => `${e}_${i}`)
                        .mapCause((c: string) => `${c}_${i}`);
                }

                expect(err.error).toContain("INITIAL_ERROR");
                expect(err.error).toContain("_99");
                expect(err.cause).toContain("cause");
                expect(err.cause).toContain("_99");
            });
        });

        describe("Prototype and property integrity", () => {
            it("should maintain correct prototype chain", () => {
                const okResult = ok(42);
                const errResult = error("ERROR");

                expect(okResult.constructor.name).toBe("Ok");
                expect(errResult.constructor.name).toBe("Err");

                expect(okResult.hasOwnProperty('ok')).toBe(true);
                expect(okResult.hasOwnProperty('value')).toBe(true);
                expect(okResult.hasOwnProperty('error')).toBe(false);
                expect(okResult.hasOwnProperty('cause')).toBe(false);

                expect(errResult.hasOwnProperty('ok')).toBe(true);
                expect(errResult.hasOwnProperty('error')).toBe(true);
                expect(errResult.hasOwnProperty('cause')).toBe(true);
                expect(errResult.hasOwnProperty('value')).toBe(false);
            });


            it("should not expose internal methods unexpectedly", () => {
                const okResult = ok(42);
                const errResult = error("ERROR");

                const okMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(okResult));
                const errMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(errResult));

                expect(okMethods).toContain('unwrap');
                expect(okMethods).toContain('map');
                expect(okMethods).toContain('match');
                expect(errMethods).toContain('unwrap');
                expect(errMethods).toContain('map');
                expect(errMethods).toContain('match');
            });
        });

        describe("Edge cases with transformations", () => {
            it("should handle transformations that throw errors", () => {
                const okResult = ok(42);

                // This should throw during the transformation, not return an Err
                expect(() => {
                    okResult.map(x => {
                        if (x > 40) throw new Error("Transform error");
                        return x * 2;
                    });
                }).toThrow("Transform error");
            });

            it("should handle transformations that return functions", () => {
                const okResult = ok(5);
                const functionResult = okResult.map(x => (y: number) => x + y);

                expect(typeof functionResult.unwrap()).toBe("function");
                expect(functionResult.unwrap()(10)).toBe(15);
            });

            it("should handle transformations that return Results", () => {
                const nestedOk = ok(42).map(x => ok(x * 2));
                const nestedErr = ok(42).map(x => error("NESTED_ERROR"));

                expect(nestedOk.unwrap().ok).toBe(true);
                expect(nestedOk.unwrap().unwrap()).toBe(84);

                expect(nestedErr.unwrap().ok).toBe(false);
                expect(nestedErr.unwrap().error).toBe("NESTED_ERROR");
            });
        });

        describe("Type inference edge cases", () => {
            it("should maintain type information through method chains", () => {
                // Testing that TypeScript correctly infers types
                const stringResult = ok("hello").map(s => s.toUpperCase());
                const numberResult = ok(42).map(n => n * 2);
                const booleanResult = ok(true).map(b => !b);

                // These should compile without type errors
                expect(typeof stringResult.unwrap()).toBe("string");
                expect(typeof numberResult.unwrap()).toBe("number");
                expect(typeof booleanResult.unwrap()).toBe("boolean");
            });

            it("should handle union type scenarios", () => {
                function getValue(succeed: boolean): any {
                    if (succeed) {
                        return ok(42);
                    } else {
                        return error("FAILED");
                    }
                }

                const successCase = getValue(true);
                const failureCase = getValue(false);

                expect(successCase.unwrap()).toBe(42);
                expect(() => failureCase.unwrap()).toThrow("FAILED");
            });
        });

        describe("Boundary value testing", () => {
            it("should handle JavaScript number edge cases", () => {
                expect(ok(Number.MAX_VALUE).unwrap()).toBe(Number.MAX_VALUE);
                expect(ok(Number.MIN_VALUE).unwrap()).toBe(Number.MIN_VALUE);
                expect(ok(Number.POSITIVE_INFINITY).unwrap()).toBe(Number.POSITIVE_INFINITY);
                expect(ok(Number.NEGATIVE_INFINITY).unwrap()).toBe(Number.NEGATIVE_INFINITY);
                expect(ok(Number.MAX_SAFE_INTEGER).unwrap()).toBe(Number.MAX_SAFE_INTEGER);
                expect(ok(Number.MIN_SAFE_INTEGER).unwrap()).toBe(Number.MIN_SAFE_INTEGER);
            });

            it("should handle NaN correctly", () => {
                const nanResult = ok(NaN);
                expect(Number.isNaN(nanResult.unwrap())).toBe(true);
                expect(nanResult.map(n => n + 1).unwrap()).toBe(NaN);
                expect(Number.isNaN(nanResult.map(n => n + 1).unwrap())).toBe(true);
            });

            it("should handle very large strings", () => {
                const largeString = "x".repeat(100000);
                const okString = ok(largeString);

                expect(okString.unwrap().length).toBe(100000);
                expect(okString.map(s => s.substring(0, 5)).unwrap()).toBe("xxxxx");
            });
        });
    });

    describe("Utility functions comprehensive tests", () => {
        describe("ok() function", () => {
            it("should create Ok instances with different value types", () => {
                expect(ok(42)).toBeInstanceOf(Object);
                expect(ok("hello")).toBeInstanceOf(Object);
                expect(ok(true)).toBeInstanceOf(Object);
                expect(ok([])).toBeInstanceOf(Object);
                expect(ok({})).toBeInstanceOf(Object);
                expect(ok(null)).toBeInstanceOf(Object);
                expect(ok(undefined)).toBeInstanceOf(Object);
            });

            it("should handle no arguments correctly", () => {
                const result = ok();
                expect(result.ok).toBe(true);
                expect(result.value).toBe(undefined);
                expect(result.unwrap()).toBe(undefined);
            });

            it("should preserve reference equality for objects", () => {
                const obj = { test: "value" };
                const result = ok(obj);
                expect(result.unwrap()).toBe(obj);
                expect(result.unwrap() === obj).toBe(true);
            });

            it("should handle symbols", () => {
                const sym = Symbol("test");
                const result = ok(sym);
                expect(result.unwrap()).toBe(sym);
                expect(typeof result.unwrap()).toBe("symbol");
            });

            it("should handle BigInt", () => {
                const bigInt = BigInt(9007199254740991);
                const result = ok(bigInt);
                expect(result.unwrap()).toBe(bigInt);
                expect(typeof result.unwrap()).toBe("bigint");
            });
        });

        describe("error() function", () => {
            it("should create Err instances with string errors", () => {
                const err = error("TEST_ERROR");
                expect(err.ok).toBe(false);
                expect(err.error).toBe("TEST_ERROR");
                expect(err.cause).toBe(undefined);
            });

            it("should create Err instances with causes of different types", () => {
                const stringErr = error("ERROR", "string cause");
                const objectErr = error("ERROR", { reason: "object cause" });
                const numberErr = error("ERROR", 404);
                const errorErr = error("ERROR", new Error("error cause"));

                expect(stringErr.cause).toBe("string cause");
                expect(objectErr.cause).toEqual({ reason: "object cause" });
                expect(numberErr.cause).toBe(404);
                expect(errorErr.cause).toBeInstanceOf(Error);
            });

            it("should handle overloaded signatures correctly", () => {
                // Without cause
                const err1 = error("NO_CAUSE");
                expect(err1.error).toBe("NO_CAUSE");
                expect(err1.cause).toBe(undefined);

                // With cause
                const err2 = error("WITH_CAUSE", "some cause");
                expect(err2.error).toBe("WITH_CAUSE");
                expect(err2.cause).toBe("some cause");
            });

            it("should handle empty string errors", () => {
                const err = error("");
                expect(err.error).toBe("");
                expect(err.cause).toBe(undefined);
            });

            it("should preserve cause reference equality", () => {
                const causeObj = { nested: { value: 42 } };
                const err = error("ERROR", causeObj);
                expect(err.cause).toBe(causeObj);
                expect(err.cause === causeObj).toBe(true);
            });
        });

        describe("wrap() function", () => {
            it("should catch and wrap synchronous errors", () => {
                const result = wrap("SYNC_ERROR", () => {
                    throw new Error("Something went wrong");
                });

                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.error).toBe("SYNC_ERROR");
                    expect(result.cause).toBeInstanceOf(Error);
                }
            });

            it("should return success for non-throwing functions", () => {
                const result = wrap("NO_ERROR", () => {
                    return "success value";
                });

                expect(result.ok).toBe(true);
                if (result.ok) {
                    expect(result.value).toBe("success value");
                }
            });

            it("should handle functions that return different types", () => {
                const numberResult = wrap("ERROR", () => 42);
                const objectResult = wrap("ERROR", () => ({ key: "value" }));
                const arrayResult = wrap("ERROR", () => [1, 2, 3]);

                expect(numberResult.ok).toBe(true);
                expect(objectResult.ok).toBe(true);
                expect(arrayResult.ok).toBe(true);

                if (numberResult.ok) expect(numberResult.value).toBe(42);
                if (objectResult.ok) expect(objectResult.value).toEqual({ key: "value" });
                if (arrayResult.ok) expect(arrayResult.value).toEqual([1, 2, 3]);
            });

            it("should handle non-Error throws", () => {
                const stringThrow = wrap("STRING_ERROR", () => {
                    throw "string error";
                });
                const numberThrow = wrap("NUMBER_ERROR", () => {
                    throw 404;
                });
                const objectThrow = wrap("OBJECT_ERROR", () => {
                    throw { reason: "object error" };
                });

                expect(stringThrow.ok).toBe(false);
                expect(numberThrow.ok).toBe(false);
                expect(objectThrow.ok).toBe(false);

                if (!stringThrow.ok) expect(stringThrow.cause).toBe(undefined);
                if (!numberThrow.ok) expect(numberThrow.cause).toBe(undefined);
                if (!objectThrow.ok) expect(objectThrow.cause).toBe(undefined);
            });

            it("should handle complex Error types", () => {
                class CustomError extends Error {
                    constructor(message: string, public code: number) {
                        super(message);
                        this.name = "CustomError";
                    }
                }

                const result = wrap("CUSTOM_ERROR", () => {
                    throw new CustomError("Custom error message", 500);
                });

                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.error).toBe("CUSTOM_ERROR");
                    expect(result.cause).toBeInstanceOf(CustomError);
                }
            });

            it("should handle functions that return falsy values", () => {
                const zeroResult = wrap("ERROR", () => 0);
                const emptyStringResult = wrap("ERROR", () => "");
                const falseResult = wrap("ERROR", () => false);
                const nullResult = wrap("ERROR", () => null);

                expect(zeroResult.ok).toBe(true);
                expect(emptyStringResult.ok).toBe(true);
                expect(falseResult.ok).toBe(true);
                expect(nullResult.ok).toBe(true);

                if (zeroResult.ok) expect(zeroResult.value).toBe(0);
                if (emptyStringResult.ok) expect(emptyStringResult.value).toBe("");
                if (falseResult.ok) expect(falseResult.value).toBe(false);
                if (nullResult.ok) expect(nullResult.value).toBe(null);
            });
        });

        describe("awrap() function", () => {
            it("should wrap resolved promises", async () => {
                const result = await awrap("ASYNC_ERROR", Promise.resolve("success"));

                expect(result.ok).toBe(true);
                if (result.ok) {
                    expect(result.value).toBe("success");
                }
            });

            it("should wrap rejected promises with Error", async () => {
                const promise = Promise.reject(new Error("Async error"));
                const result = await awrap("ASYNC_ERROR", promise);

                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.error).toBe("ASYNC_ERROR");
                    expect(result.cause).toBeInstanceOf(Error);
                }
            });

            it("should handle rejected promises with non-Error values", async () => {
                const stringReject = awrap("STRING_ERROR", Promise.reject("string error"));
                const numberReject = awrap("NUMBER_ERROR", Promise.reject(404));
                const objectReject = awrap("OBJECT_ERROR", Promise.reject({ reason: "object" }));

                const [stringResult, numberResult, objectResult] = await Promise.all([
                    stringReject, numberReject, objectReject
                ]);

                expect(stringResult.ok).toBe(false);
                expect(numberResult.ok).toBe(false);
                expect(objectResult.ok).toBe(false);

                if (!stringResult.ok) expect(stringResult.cause).toBe(undefined);
                if (!numberResult.ok) expect(numberResult.cause).toBe(undefined);
                if (!objectResult.ok) expect(objectResult.cause).toBe(undefined);
            });

            it("should handle promises resolving to different types", async () => {
                const numberPromise = awrap("ERROR", Promise.resolve(42));
                const objectPromise = awrap("ERROR", Promise.resolve({ key: "value" }));
                const arrayPromise = awrap("ERROR", Promise.resolve([1, 2, 3]));

                const [numberResult, objectResult, arrayResult] = await Promise.all([
                    numberPromise, objectPromise, arrayPromise
                ]);

                expect(numberResult.ok).toBe(true);
                expect(objectResult.ok).toBe(true);
                expect(arrayResult.ok).toBe(true);

                if (numberResult.ok) expect(numberResult.value).toBe(42);
                if (objectResult.ok) expect(objectResult.value).toEqual({ key: "value" });
                if (arrayResult.ok) expect(arrayResult.value).toEqual([1, 2, 3]);
            });

            it("should handle promises resolving to falsy values", async () => {
                const zeroPromise = awrap("ERROR", Promise.resolve(0));
                const emptyStringPromise = awrap("ERROR", Promise.resolve(""));
                const falsePromise = awrap("ERROR", Promise.resolve(false));
                const nullPromise = awrap("ERROR", Promise.resolve(null));

                const [zeroResult, emptyStringResult, falseResult, nullResult] = await Promise.all([
                    zeroPromise, emptyStringPromise, falsePromise, nullPromise
                ]);

                expect(zeroResult.ok).toBe(true);
                expect(emptyStringResult.ok).toBe(true);
                expect(falseResult.ok).toBe(true);
                expect(nullResult.ok).toBe(true);

                if (zeroResult.ok) expect(zeroResult.value).toBe(0);
                if (emptyStringResult.ok) expect(emptyStringResult.value).toBe("");
                if (falseResult.ok) expect(falseResult.value).toBe(false);
                if (nullResult.ok) expect(nullResult.value).toBe(null);
            });


            it("should handle immediately rejected promises", async () => {
                const immediateReject = Promise.reject(new Error("Immediate error"));
                const result = await awrap("IMMEDIATE_ERROR", immediateReject);

                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.error).toBe("IMMEDIATE_ERROR");
                    expect(result.cause).toBeInstanceOf(Error);
                }
            });

            it("should maintain error types through promise chains", async () => {
                class NetworkError extends Error {
                    constructor(message: string, public statusCode: number) {
                        super(message);
                        this.name = "NetworkError";
                    }
                }

                const networkError = new NetworkError("Connection failed", 500);
                const result = await awrap("NETWORK_ERROR", Promise.reject(networkError));

                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.cause).toBeInstanceOf(NetworkError);
                }
            });
        });

        describe("Utility function interactions", () => {
            it("should work together in complex scenarios", async () => {
                // Combining wrap and awrap
                const wrappedAsync = wrap("WRAP_ERROR", () => {
                    return awrap("ASYNC_ERROR", Promise.resolve("nested success"));
                });

                expect(wrappedAsync.ok).toBe(true);
                if (wrappedAsync.ok) {
                    const asyncResult = await wrappedAsync.value;
                    expect(asyncResult.ok).toBe(true);
                    if (asyncResult.ok) {
                        expect(asyncResult.value).toBe("nested success");
                    }
                }
            });

            it("should handle error propagation through utility functions", () => {
                const wrappedError = wrap("OUTER_ERROR", () => {
                    const innerResult = error("INNER_ERROR", "inner cause");
                    if (!innerResult.ok) {
                        throw new Error(`Inner failed: ${innerResult.error}`);
                    }
                    throw new Error("This should not happen");
                });

                expect(wrappedError.ok).toBe(false);
                if (!wrappedError.ok) {
                    expect(wrappedError.error).toBe("OUTER_ERROR");
                    expect(wrappedError.cause).toBeInstanceOf(Error);
                }
            });

            it("should maintain type consistency across utility functions", () => {
                const okValue = ok(42);
                const errorValue = error("ERROR", "cause");

                expect(typeof okValue.ok).toBe("boolean");
                expect(typeof errorValue.ok).toBe("boolean");
                expect(okValue.ok).toBe(true);
                expect(errorValue.ok).toBe(false);

                const wrappedOk = wrap("WRAP_ERROR", () => okValue.unwrap());
                expect(wrappedOk.ok).toBe(true);

                const wrappedError = wrap("WRAP_ERROR", () => errorValue.unwrap());
                expect(wrappedError.ok).toBe(false);
            });
        });
    });

    describe("Integration and chaining comprehensive tests", () => {
        describe("Complex method chaining", () => {
            it("should handle long chains of Ok operations", () => {
                const result = ok(10)
                    .map(x => x * 2)
                    .map(x => x + 5)
                    .map(x => x.toString())
                    .map(s => s.padStart(3, '0'))
                    .mapOr("fallback", s => s.toUpperCase())
                    .map(s => `Result: ${s}`);

                expect(result.unwrap()).toBe("Result: 025");
            });

            it("should handle long chains with mixed operations", () => {
                const result = ok("hello")
                    .map(s => s.toUpperCase())
                    .map(s => s.split(''))
                    .map(arr => arr.reverse())
                    .map(arr => arr.join('-'))
                    .mapOr("default", s => s.toLowerCase())
                    .withError("CHAIN_ERROR");

                expect(result.unwrap()).toBe("o-l-l-e-h");
            });

            it("should short-circuit on first error in chains", () => {
                const mapSpy = jest.fn();
                const result = error("INITIAL_ERROR")
                    .map(mapSpy)
                    .mapOr("fallback", () => "not called")
                    .map(s => s.toUpperCase());

                expect(result.unwrap()).toBe("FALLBACK");
                expect(mapSpy).not.toHaveBeenCalled();
            });

            it("should handle error transformations in chains", () => {
                const result = error("validation_error", "field is required")
                    .mapError(e => e.toUpperCase())
                    .mapError(e => `ERR_${e}`)
                    .mapCause(c => `Cause: ${c}`)
                    .withError("FINAL_ERROR");

                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.error).toBe("FINAL_ERROR");
                    expect(result.cause).toBe("Cause: field is required");
                }
            });
        });

        describe("Real-world scenarios", () => {
            interface User {
                id: number;
                name: string;
                email: string;
                active: boolean;
            }

            function validateUser(user: any): Result<User, "VALIDATION_ERROR"> {
                if (!user) return error("VALIDATION_ERROR");
                if (typeof user.id !== 'number') return error("VALIDATION_ERROR");
                if (typeof user.name !== 'string' || user.name.length === 0) return error("VALIDATION_ERROR");
                if (typeof user.email !== 'string' || !user.email.includes('@')) return error("VALIDATION_ERROR");

                return ok({
                    id: user.id,
                    name: user.name,
                    email: user.email.toLowerCase(),
                    active: user.active ?? true
                });
            }

            function formatUserDisplay(user: User): string {
                const status = user.active ? "Active" : "Inactive";
                return `${user.name} <${user.email}> [${status}]`;
            }

            it("should handle user validation and formatting pipeline", () => {
                const validUser = { id: 1, name: "John Doe", email: "JOHN@EXAMPLE.COM", active: true };
                const result = validateUser(validUser)
                    .map(formatUserDisplay)
                    .mapOr("Unknown User", display => `User: ${display}`);

                expect(result.unwrap()).toBe("User: John Doe <john@example.com> [Active]");
            });

            it("should handle invalid user gracefully", () => {
                const invalidUser = { id: "not-a-number", name: "", email: "invalid-email" };
                const result = validateUser(invalidUser)
                    .map(formatUserDisplay)
                    .mapOr("Unknown User", display => `User: ${display}`);

                expect(result.unwrap()).toBe("Unknown User");
            });

            it("should handle null user input", () => {
                const result = validateUser(null)
                    .mapError(e => `ERR_${e}`)
                    .match({
                        ok: user => `Valid: ${user.name}`,
                        err: (error) => `Invalid: ${error}`
                    });

                expect(result).toBe("Invalid: ERR_VALIDATION_ERROR");
            });
        });

        describe("Async integration patterns", () => {
            async function fetchUser(id: number): Promise<Result<{ name: string }, "NOT_FOUND">> {
                await new Promise(resolve => setTimeout(resolve, 1));
                if (id === 1) return ok({ name: "Alice" });
                return error("NOT_FOUND");
            }

            it("should handle successful async operations", async () => {
                const userResult = await fetchUser(1);

                expect(userResult.ok).toBe(true);
                if (userResult.ok) {
                    expect(userResult.value.name).toBe("Alice");
                }
            });

            it("should handle user not found scenario", async () => {
                const userResult = await fetchUser(999);

                const result = userResult.match({
                    ok: user => `Welcome ${user.name}`,
                    err: () => "Please register"
                });

                expect(result).toBe("Please register");
            });

            it("should handle mixed sync/async workflows", async () => {
                const syncResult = ok(1);
                const asyncResult = await awrap("FETCH_ERROR", fetchUser(syncResult.unwrap()));

                expect(asyncResult.ok).toBe(true);
                if (asyncResult.ok && asyncResult.value.ok) {
                    expect(asyncResult.value.value.name).toBe("Alice");
                }
            });
        });

        describe("Error handling patterns", () => {
            function divideBy(a: number, b: number): Result<number, "DIVISION_BY_ZERO"> {
                if (b === 0) return error("DIVISION_BY_ZERO");
                return ok(a / b);
            }

            function parseNumber(str: string): Result<number, "PARSE_ERROR"> {
                const num = parseFloat(str);
                if (isNaN(num)) return error("PARSE_ERROR");
                return ok(num);
            }

            it("should handle successful computations", () => {
                const result = parseNumber("10")
                    .map(a => divideBy(a, 2).unwrapOr(0))
                    .unwrapOr(0);

                expect(result).toBe(5);
            });

            it("should handle division by zero", () => {
                const result = divideBy(10, 0).unwrapOr(-1);
                expect(result).toBe(-1);
            });

            it("should handle parse error gracefully", () => {
                const result = parseNumber("invalid").unwrapOr(0);
                expect(result).toBe(0);
            });
        });

        describe("Type system integration", () => {
            function queryDatabase(query: string): Result<{ rows: number }, "CONNECTION_FAILED" | "QUERY_FAILED"> {
                if (query.includes("SELECT")) return ok({ rows: 5 });
                if (query.includes("INVALID")) return error("QUERY_FAILED");
                return error("CONNECTION_FAILED");
            }

            function validateInput(input: string): Result<string, "INVALID_INPUT" | "MISSING_FIELD"> {
                if (!input) return error("MISSING_FIELD");
                if (input.length < 3) return error("INVALID_INPUT");
                return ok(input.trim());
            }

            it("should handle successful query pipeline", () => {
                const validationResult = validateInput("SELECT * FROM users");
                expect(validationResult.ok).toBe(true);

                if (validationResult.ok) {
                    const queryResult = queryDatabase(validationResult.value);
                    expect(queryResult.ok).toBe(true);
                    if (queryResult.ok) {
                        expect(queryResult.value.rows).toBe(5);
                    }
                }
            });

            it("should handle validation errors", () => {
                const result = validateInput("");
                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.error).toBe("MISSING_FIELD");
                }
            });

            it("should handle database errors", () => {
                const result = queryDatabase("INVALID QUERY");
                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.error).toBe("QUERY_FAILED");
                }
            });
        });

        describe("Performance and memory patterns", () => {
            it("should handle large data transformations efficiently", () => {
                const largeArray = new Array(10000).fill(0).map((_, i) => i);

                const result = ok(largeArray)
                    .map(arr => arr.filter(n => n % 2 === 0))
                    .map(arr => arr.map(n => n * 2))
                    .map(arr => arr.slice(0, 100))
                    .map(arr => arr.reduce((sum, n) => sum + n, 0));

                expect(result.unwrap()).toBe(19800); // Sum of first 100 even numbers doubled
            });

            it("should handle nested Result transformations", () => {
                const nestedOk = ok(ok(42));

                const flattened = nestedOk.map(inner => inner.unwrap());

                expect(flattened.unwrap()).toBe(42);
            });

            it("should handle Result arrays and batch operations", () => {
                const results: Result<number, string>[] = [ok(1), error("ERROR"), ok(3), ok(4)];

                const processedResults = results.map(result =>
                    result.map(x => x * 2).unwrapOr(0)
                );

                expect(processedResults).toEqual([2, 0, 6, 8]);

                const allSuccessful = results.every(r => r.ok);
                const someSuccessful = results.some(r => r.ok);
                const successfulCount = results.filter(r => r.ok).length;

                expect(allSuccessful).toBe(false);
                expect(someSuccessful).toBe(true);
                expect(successfulCount).toBe(3);
            });
        });

        describe("Edge case integrations", () => {
            it("should handle recursive Result operations", () => {
                function factorial(n: number): Result<number, "NEGATIVE_INPUT"> {
                    if (n < 0) return error("NEGATIVE_INPUT");
                    if (n <= 1) return ok(1);

                    return factorial(n - 1).map(prev => prev * n);
                }

                expect(factorial(5).unwrap()).toBe(120);
                expect(factorial(-1).ok).toBe(false);
                expect(factorial(0).unwrap()).toBe(1);
            });

            it("should handle Result in callback patterns", () => {
                const callback = (result: Result<number, string>) => {
                    return result
                        .map(n => n * 2)
                        .mapError(e => `CALLBACK_${e}`)
                        .match({
                            ok: value => `Success: ${value}`,
                            err: error => `Error: ${error}`
                        });
                };

                expect(callback(ok(21))).toBe("Success: 42");
                expect(callback(error("FAILED"))).toBe("Error: CALLBACK_FAILED");
            });

            it("should maintain immutability through complex operations", () => {
                const original = ok({ count: 5, items: ["a", "b", "c"] });

                const modified = original
                    .map(obj => ({ ...obj, count: obj.count + 1 }))
                    .map(obj => ({ ...obj, items: [...obj.items, "d"] }));

                expect(original.unwrap().count).toBe(5);
                expect(original.unwrap().items).toEqual(["a", "b", "c"]);
                expect(modified.unwrap().count).toBe(6);
                expect(modified.unwrap().items).toEqual(["a", "b", "c", "d"]);
            });
        });
    });
});
