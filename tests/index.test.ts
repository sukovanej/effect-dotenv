import { Config, Effect, Either, Layer, pipe } from "effect";
import { DotEnv } from "effect-dotenv";

import { modifyEnv, withTmpDotEnvFile } from "./utils";

const exampleConfig = Config.all({
  value: Config.string("VALUE"),
  number: Config.number("NUMBER"),
});

const readExampleConfig = (envFilePath: string) =>
  pipe(exampleConfig, Effect.provide(DotEnv.setConfigProvider(envFilePath)));

test("Load from env file", async () => {
  const program = withTmpDotEnvFile(
    "VALUE=hello\nNUMBER=69",
    readExampleConfig,
  );

  const result = await Effect.runPromise(program);

  expect(result).toEqual({ value: "hello", number: 69 });
});

test("Load from process env if the env file doesn't exist", async () => {
  const program = pipe(
    Effect.all([modifyEnv("VALUE", "hello"), modifyEnv("NUMBER", "69")]),
    Effect.flatMap(() => readExampleConfig(".env")),
    Effect.scoped,
  );

  const result = await Effect.runPromise(program);

  expect(result).toEqual({ value: "hello", number: 69 });
});

test("Load from both process env and dotenv file", async () => {
  const program = withTmpDotEnvFile("NUMBER=69", (envFilePath) =>
    pipe(
      modifyEnv("VALUE", "hello"),
      Effect.flatMap(() => readExampleConfig(envFilePath)),
      Effect.scoped,
    ),
  );

  const result = await Effect.runPromise(program);

  expect(result).toEqual({ value: "hello", number: 69 });
});

test("Process env has precedence over dotenv", async () => {
  const program = withTmpDotEnvFile("NUMBER=69\nVALUE=another", (envFilePath) =>
    pipe(
      modifyEnv("VALUE", "hello"),
      Effect.flatMap(() => readExampleConfig(envFilePath)),
      Effect.scoped,
    ),
  );

  const result = await Effect.runPromise(program);

  expect(result).toEqual({ value: "hello", number: 69 });
});

test("Dotnet config provider fails if no .env file is found", async () => {
  const program = pipe(
    exampleConfig,
    Effect.provide(
      pipe(
        DotEnv.makeConfigProvider(".non-existing-env-file"),
        Effect.map(Layer.setConfigProvider),
        Layer.unwrapEffect,
      ),
    ),
  );

  const result = await Effect.runPromise(Effect.either(program));
  expect(Either.isLeft(result)).toBe(true);

  const resultError = (
    result as Either.Left<DotEnv.NoAvailableDotEnvFileError, never>
  ).left;

  expect(resultError.files).toEqual([".non-existing-env-file"]);
});
