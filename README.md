# effect-dotenv

[dotenv](https://github.com/motdotla/dotenv) + [dotenv-expand](https://github.com/motdotla/dotenv-expand)
as a [ConfigProvider](https://effect-ts.github.io/effect/effect/ConfigProvider.ts.html) implementation for [Effect-TS](https://github.com/Effect-TS/effect)

## Installation

```
pnpm add effect-dotenv
```

## Usage

Use `DotEnv.layer(<filename>)` to replace the current ConfigProvider with a .env one.

```ts
import { Config, Effect } from "effect";
import { DotEnv } from "effect-dotenv";

import { NodeContext } from "@effect/platform-node";

const program = Effect.gen(function* () {
  const config = yield* Config.all({
    value: Config.string("VALUE"),
  });
  yield* Effect.log(`value = ${config.value}`);
}).pipe(
  Effect.provide(DotEnv.layer(".env")),
  Effect.provide(NodeContext.layer),
);

Effect.runPromise(program);
```

Alternatively, you can employ the `DotEnv.layerAsFallback` which sets a ConfigProvider
that uses the .env as a fallback. It attemps to resolve the given config from the
`process.env` (assuming the current config provider is the default one) and if not found
it tries the .env.

In case you need a more customized setup, use the `DotEnv.makeConfigProvider` which produces
an effect constructing the .env ConfigProvider. You'll probably want to use it along with
the `Layer.setConfigProvider` combinator from `effect`.
