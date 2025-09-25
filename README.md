<div align="center">
    <h1 align="center">🐻<br/>rizzly</h1>
    <p align="center">
        A rust inspired results types library for typescript with
        static type inference
        <br/>
        by <a href="https://x.com/fvdessen">@fvdessen</a>
    </p>
    <p align="center">
        <a href="https://github.com/fvdsn/rizzly/actions/workflows/test.yml" rel="nofollow"><img src="https://github.com/fvdsn/rizzly/actions/workflows/test.yml/badge.svg" alt="Test Status"></a>
        <a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/fvdsn/rizzly" alt="License"></a>
    </p>
</div>
<br/>

## What is rizzly ?

Rizzly allows you to handle your application errors with results types instead of exceptions. It is similar to
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

let res = makeUsername("john smith")

if (res.ok) {
    console.log(`Username is ${res.value} !`)
} else if (res.error === "empty") {
    console.error("Username is empty :(")
} else if (res.error === "too-long") {
    console.log(`Username is too long (max: ${res.cause.max})`)
}
```
