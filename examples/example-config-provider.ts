import { Config, Effect, Layer, pipe } from "effect";
import { dotEnvConfigProvider } from "effect-dotenv";

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
);

Effect.runPromise(program);
