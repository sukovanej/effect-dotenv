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
      dotEnvConfigProvider(".env"),
      Effect.map(Effect.setConfigProvider),
      Layer.unwrapEffect,
    ),
  ),
  Effect.scoped,
);

Effect.runPromise(program);
