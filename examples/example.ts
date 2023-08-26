import { Config, Effect, pipe } from "effect";
import { setDotEnvConfigProvider } from "effect-dotenv";

const exampleConfig = Config.all({
  value: Config.string("VALUE"),
});

const program = pipe(
  Effect.config(exampleConfig),
  Effect.flatMap((config) => Effect.log(`value = ${config.value}`)),
  Effect.provideSomeLayer(setDotEnvConfigProvider()),
);

Effect.runPromise(program);
