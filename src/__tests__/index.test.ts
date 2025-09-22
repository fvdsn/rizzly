import { ok, success, failure, unwrap, wrap, awrap, Result, OkOrFailure } from "../index";

describe("Result Types", () => {
    describe("ok()", () => {
        it("should return a success with undefined value", () => {
            const result = ok();
            expect(result.ok).toBe(true);
            expect(result.value).toBeUndefined();
        });
    });

    describe("success()", () => {
        it("should return a success with the provided value", () => {
            const result = success(42);
            expect(result.ok).toBe(true);
            expect(result.value).toBe(42);
        });

        it("should work with different types", () => {
            const stringResult = success("hello");
            const objectResult = success({ name: "test" });

            expect(stringResult.ok).toBe(true);
            expect(stringResult.value).toBe("hello");
            expect(objectResult.ok).toBe(true);
            expect(objectResult.value).toEqual({ name: "test" });
        });
    });

    describe("failure()", () => {
        it("should return a failure with the provided error type", () => {
            const result = failure("NETWORK_ERROR");
            expect(result.ok).toBe(false);
            expect(result.failure).toBe("NETWORK_ERROR");
            expect(result.message).toBeUndefined();
            expect(result.error).toBeUndefined();
        });

        it("should include message and error when provided", () => {
            const error = new Error("Connection failed");
            const result = failure("NETWORK_ERROR", "Failed to connect", error);

            expect(result.ok).toBe(false);
            expect(result.failure).toBe("NETWORK_ERROR");
            expect(result.message).toBe("Failed to connect");
            expect(result.error).toBe(error);
        });
    });

    describe("unwrap()", () => {
        it("should return the value when result is successful", () => {
            const result = success(42);
            expect(unwrap(result)).toBe(42);
        });

        it("should throw an error when result is a failure", () => {
            const result = failure("ERROR", "Something went wrong");
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
                expect(result.failure).toBe("PARSE_ERROR");
                expect(result.error).toBeInstanceOf(SyntaxError);
                expect(result.message).toContain("SyntaxError");
            }
        });

        it("should return failure when callback throws a non-Error", () => {
            const result = wrap("CUSTOM_ERROR", () => {
                throw "string error";
            });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.failure).toBe("CUSTOM_ERROR");
                expect(result.message).toBe("string error");
                expect(result.error).toBeUndefined();
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
                expect(result.failure).toBe("ASYNC_ERROR");
                expect(result.error).toBe(error);
                expect(result.message).toContain("Error: Async failed");
            }
        });

        it("should return failure when promise rejects with non-Error", async () => {
            const result = await awrap("ASYNC_ERROR", Promise.reject("string error"));
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.failure).toBe("ASYNC_ERROR");
                expect(result.message).toBe("string error");
                expect(result.error).toBeUndefined();
            }
        });
    });

    describe("Type checking", () => {
        it("should work with proper TypeScript types", () => {
            type MyError = "NETWORK_ERROR" | "PARSE_ERROR";
            const successResult: Result<number, MyError> = success(42);
            const failureResult: Result<number, MyError> = failure("NETWORK_ERROR");

            if (successResult.ok) {
                let value: number = successResult.value;
                expect(typeof successResult.value).toBe("number");
            }

            if (!failureResult.ok) {
                let failure: MyError = failureResult.failure;
                expect(["NETWORK_ERROR", "PARSE_ERRROR"]).toContain(failureResult.failure);
            }
        });

        it("Result type should be returnable from a function", () => {
            function doSomething(): Result<number, "NETWORK_ERROR" | "PARSE_ERROR"> {
                if (42 < 55) {
                    return success(42);
                } else {
                    return failure("NETWORK_ERROR");
                }
            }

            expect(unwrap(doSomething())).toBe(42);
        });

        it("OkOrFailure type should be returnable from a function", () => {
            function checkSomething(): OkOrFailure<"NETWORK_ERROR" | "PARSE_ERROR"> {
                if (42 < 55) {
                    return ok();
                } else {
                    return failure("NETWORK_ERROR");
                }
            }
            expect(unwrap(checkSomething())).toBeUndefined();
        });

        it("Types should be correctly inferred", () => {
            function doSomething() {
                if (42 < 55) {
                    return success(99);
                } else if (43 < 55) {
                    return failure("NETWORK_ERROR");
                } else {
                    return failure("PARSE_ERROR");
                }
            }

            let res: Result<number, "NETWORK_ERROR" | "PARSE_ERROR"> = doSomething();
            expect(unwrap(res)).toBe(99);
        });
    });
});
