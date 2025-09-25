<div align="center">
    <h1 align="center">🐻<br/>rizzly</h1>
    <p align="center">
        A rust inspired results types library for typescript with
        static type inference
        <br/>
        by <a href="https://x.com/fvdessen">@fvdessen</a>
    </p>
    <p align="center">
        <a href="https://www.npmjs.com/package/rizzly" rel="nofollow"><img src="https://img.shields.io/npm/dm/rizzly" alt="NPM Downloads"></a>
        <a href="https://github.com/fvdsn/rizzly/actions/workflows/test.yml" rel="nofollow"><img src="https://github.com/fvdsn/rizzly/actions/workflows/test.yml/badge.svg" alt="Test Status"></a>
        <a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/fvdsn/rizzly" alt="License"></a>
    </p>
</div>
<br/>

## What is rizzly ?

Rizzly lets you handle your application errors with results types instead of exceptions. It is similar to
other popular results type libraries like <a href="https://github.com/supermacro/neverthrow">neverthrow</a> and <a href="https://github.com/traverse1984/oxide.ts">oxide.ts</a> but with much better static type inference. Rizzly is tiny and has zero dependencies.

Let's have a look at an example

```ts
import { ok, error } from 'rizzly'

function makeUsername(name: string) {
    if (!name) {
        return error("empty")
    } else if (name.length >= 10) {
        return error("too-long", {max: 10})
    } else {
        return ok(name)
    }
}

let res = makeUsername("John Smith")

if (res.ok) {
    console.log(res.value)
} else if (res.error === "empty") {
    console.error("It's empty :(")
} else if (res.error === "too-long") {
    console.log(`Too long ! (max: ${res.cause.max})`)
}
```
- We did not write any type, yet everything is type checked.
- We cannot get the `value` out of `res` without checking `ok` (or using a convenience method, let's see later)
- `res.error` can only be compared with actual, possible error types. Possible error types for a result are always known and can be auto completed by your editor
- `res.cause` can hold any data and is also type checked.
- We do not need to explicitly tell the possible returned types on a function, they are correctly inferred.

## Documentation

### wrap( _fn_ )

```ts
import { wrap } from "rizzly"

let res = wrap(() => JSON.parse(value))
```

`wrap()` lets you create results from functions that can throw errors. If the function throws an `Error`, the exception is put as the `.cause`
of the result. Otherwise, the returned value is put as the result value.

### awrap( _promise_ )

```ts
import { awrap } from "rizzly"

let res = await awrap(fetch("https://perdu.com"))
```

`awrap()` lets you create results from functions that return promises. If the promise fails, the result is failed as well and the error is put as the cause. Note that `awrap()` returns a promise of the result.

### res.unwrap()

```ts

let val = doSomething().unwrap()
```
`res.unwrap()` lets you directly get the value of a result, but throws an Error if the result is failed. The `cause` of the result is set as the cause of the `Error`, and the `error` as its message. Mainly useful in tests where you expect things to go right.

### res.unwrapOr( _default_ )

```ts
let json = wrap(() => JSON.parse(value)).unwrapOr({ data: {} })
```
`res.unwrapOr()` lets you directly get the value of a result, or a default if the result is failed.
