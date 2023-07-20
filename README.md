# effect-dotenv

[dotenv](https://github.com/motdotla/dotenv) [ConfigProvider](https://effect-ts.github.io/io/modules/Config/Provider.ts.html) implementation for [Effect-TS](https://github.com/Effect-TS)

```
pnpm add effect-dotenv
```

## Using `setDotEnvConfigProvider`

`setDotEnvConfigProvider` creates a layer that will attempt to load
the .env file. If the .env file doesn't exist, it will use the current
`ConfigProvider` instead. If a .env is found, the derived `ConfigProvider`
will be used as a fallback of the current `ConfigProvider`. This results
in the standard behaviour where environment variable is used if set,
otherwise it attempts to load it from the .env file.

The input parameters can be
- *ommited completely* - `.env` file is used by default
- *a string* - it will attempt to load a file on the given path
- *list of strings* - it will use the first existing .env file from the list

```ts
import { setDotEnvConfigProvider } from "effect-dotenv";

import { pipe } from "@effect/data/Function";
import * as Config from "@effect/io/Config";
import * as Effect from "@effect/io/Effect";

const exampleConfig = Config.all({
  value: Config.string("VALUE"),
});

const program = pipe(
  Effect.config(exampleConfig),
  Effect.flatMap((config) => Effect.log(`value = ${config.value}`)),
  Effect.provideSomeLayer(setDotEnvConfigProvider()),
  Effect.scoped,
);

Effect.runPromise(program);
```

## Using `dotEnvConfigProvider`

The example below configures config provider that will read the config
from `.env` file. The `program` effect will fail with `NoAvailableDotEnvFileError`
error if the `.env` file doesn't exist.

```ts
import { dotEnvConfigProvider } from "effect-dotenv";

import { pipe } from "@effect/data/Function";
import * as Config from "@effect/io/Config";
import * as Effect from "@effect/io/Effect";
import * as Layer from "@effect/io/Layer";

const exampleConfig = Config.all({
  value: Config.string("VALUE"),
});

const program = pipe(
  Effect.config(exampleConfig),
  Effect.flatMap((config) => Effect.log(`value = ${config.value}`)),
  Effect.provideSomeLayer(
    pipe(
      dotEnvConfigProvider(),
      Effect.map(Effect.setConfigProvider),
      Layer.unwrapEffect,
    ),
  ),
  Effect.scoped,
);

Effect.runPromise(program);
```
