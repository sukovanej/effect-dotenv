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
  Effect.provideSomeLayer(setDotEnvConfigProvider(".env")),
  Effect.scoped,
);

Effect.runPromise(program);
