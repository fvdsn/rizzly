import { ok, error, unwrap, wrap, awrap, Result, VoidResult } from "../index";

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

    describe("unwrap()", () => {
        it("should return the value when result is successful", () => {
            const result = ok(42);
            expect(unwrap(result)).toBe(42);
        });

        it("should throw an error when result is a failure", () => {
            const result = error("ERROR");
            expect(() => unwrap(result)).toThrow("ERROR");
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
            function doSomething(): Result<number, "NETWORK_ERROR" | "PARSE_ERROR"> {
                if (42 < 55) {
                    return ok(42);
                } else {
                    return error("NETWORK_ERROR");
                }
            }

            expect(unwrap(doSomething())).toBe(42);
        });

        it("OkOrFailure type should be returnable from a function", () => {
            function checkSomething(): VoidResult<"NETWORK_ERROR" | "PARSE_ERROR"> {
                if (42 < 55) {
                    return ok();
                } else {
                    return error("NETWORK_ERROR");
                }
            }
            expect(unwrap(checkSomething())).toBeUndefined();
        });

        it("Types should be correctly inferred", () => {
            function doSomething() {
                if (42 < 55) {
                    return ok(99);
                } else if (43 < 55) {
                    return error("NETWORK_ERROR");
                } else {
                    return error("PARSE_ERROR");
                }
            }

            let res: Result<number, "NETWORK_ERROR" | "PARSE_ERROR"> = doSomething();
            expect(unwrap(res)).toBe(99);
        });
    });
    describe("Type checking", () => {
        it("should work with proper TypeScript types", () => {});
    });
});
