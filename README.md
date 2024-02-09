# effect-dotenv

[dotenv](https://github.com/motdotla/dotenv) [ConfigProvider](https://effect-ts.github.io/io/modules/ConfigProvider.ts.html) implementation for [Effect-TS](https://github.com/Effect-TS)

```
pnpm add effect-dotenv
```

## Using `setConfigProvider` layer

`setDotEnvConfigProvider` creates a layer that will attempt to load
the .env file. If the .env file doesn't exist, it will use the current
`ConfigProvider` instead. If a .env is found, the derived `ConfigProvider`
will be used as a fallback of the current `ConfigProvider`. This results
in the standard behaviour where environment variable is used if set,
otherwise it attempts to load it from the .env file.

The input parameters can be

- _ommited completely_ - `.env` file is used by default
- _a string_ - it will attempt to load a file on the given path
- _list of strings_ - it will use the first existing .env file from the list

```ts
import { NodeContext } from "@effect/platform-node"
import { Config, Effect, pipe } from "effect";
import { DotEnv } from "effect-dotenv";

const exampleConfig = Config.all({
  value: Config.string("VALUE"),
});

const program = pipe(
  Effect.config(exampleConfig),
  Effect.flatMap((config) => Effect.log(`value = ${config.value}`)),
  Effect.provide(DotEnv.setConfigProvider()),
  Effect.provide(NodeContext.layer)
);

Effect.runPromise(program);
```

## Using `makeConfigProvider` effect

The example below configures config provider that will read the config
from `.env` file. The `program` effect will fail with `NoAvailableDotEnvFileError`
error if the `.env` file doesn't exist.

```ts
import { NodeContext } from "@effect/platform-node"
import { Config, Effect, Layer, pipe } from "effect";
import { DotEnv } from "effect-dotenv";

const exampleConfig = Config.all({
  value: Config.string("VALUE"),
});

const program = pipe(
  Effect.config(exampleConfig),
  Effect.flatMap((config) => Effect.log(`value = ${config.value}`)),
  Effect.provide(
    pipe(
      DotEnv.makeConfigProvider(".env"),
      Effect.map(Layer.setConfigProvider),
      Layer.unwrapEffect,
    ),
  ),
  Effect.provide(NodeContext.layer)
);

Effect.runPromise(program);
```
