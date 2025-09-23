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

        it("asError, when no errors", () => {
            let res = doSomething("succeeds").asError("NEW_ERROR");
            expect(res.unwrap()).toBe(42);
        });

        it("asError, when errors", () => {
            let res = doSomething("fails").asError("NEW_ERROR");
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
    });
});
