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
- We do not need to explicitly tell the possible returned types on a function, they are correctly inferred. The inferance also works with
  function composition.

## Documentation

### wrap( _string_, _fn_ )

```ts
import { wrap } from "rizzly"

let res = wrap('parse-error', () => JSON.parse(value))
```

`wrap()` lets you create results from functions that can throw errors. If the function throws an `Error`, the exception is put as the `.cause`
of the result. Otherwise, the returned value is put as the result value.

### awrap( _string_, _promise_ )

```ts
import { awrap } from "rizzly"

let res = await awrap('network-error', fetch("https://perdu.com"))
```

`awrap()` lets you create results from functions that return promises. If the promise fails, the result is failed as well and the error is put as the cause. Note that `awrap()` returns a promise of the result.

## Methods of _Result_

#### res.unwrap()

```ts

let val = doSomething().unwrap()
```
`res.unwrap()` lets you directly get the value of a result, but throws an Error if the result is failed. The `cause` of the result is set as the cause of the `Error`, and the `error` as its message. Mainly useful in tests where you expect things to go right.

#### res.unwrapOr( _default_ )

```ts
let json = wrap('err', () => JSON.parse(value)).unwrapOr({ data: {} })
```
`res.unwrapOr()` lets you directly get the `value` of a result, or a default if the result is failed.

#### res.map( _fn_ )

```ts
let res = getUsername().map((name) => name.toLowerCase())
```

`res.map()` lets you change the `value` of the result without needing to unwrap the value.

#### res.mapError( _fn_ )

```ts
let res = getData().mapError((error) => i18n.translate(error))
```
`res.mapError()` lets you change the value of the `error` in case of failure. The `cause` is left untouched.

#### res.mapCause( _fn_ )

```ts
let res = getData().mapCause((cause) => { errors: [cause] })
```
`res.mapCause()` lets you alter the `cause` of the failure. The `error` name is left untouched.

#### res.withError( _string_ )

```ts
let res = doManyThings().withError('something failed')
```
`res.withError()` lets you set the error type of the result in case of failure. The `cause` is left untouched. This is useful when a
result has many possible `errors` which you do not care about in a specific context.

#### res.withErrorAndCause( _string_, _any_ )

```ts
let res = doManyThings().withErrorAndCause('something failed', { code: `ERR48321` })
```

`res.withErrorAndCause()` does the same thing as `res.withError()` but also sets the `cause`.

#### res.match( _{ ok: fn, err: fn }_ )

```ts
let userName = getUser().match({
    ok: (user) => user.userName,
    err: (error, cause) => "guest",
})
```
`res.match()` takes an `ok` and an `err` callback that return the value of the `match` call.

## Types

### Ok<_T_>
> - ok: true
> - value: _T_

The type of a succesfull result

### Err<_E extends string_, _C_>
> - ok: false
> - error: _E_
> - cause: _C_

The type of a failed result

### Result<_T_, _E extends string_>
> Ok<_T_> | Err<_E_, _undefined_>

Basic result, without a cause. If you want to specify multiple possible errors, you can put them as a string union.

```ts
function doManyThings(): Result<number, "ERROR_A" | "ERROR_B" | "ERROR_C"> {
    ...
}
```

### ResultWithCause<_T_, _E extends string_, _C_>
> Ok<_T_> | Err<_E_,_C_>

When you want to specify the cause.
