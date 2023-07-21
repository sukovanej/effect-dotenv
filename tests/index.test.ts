import {
  NoAvailableDotEnvFileError,
  dotEnvConfigProvider,
  setDotEnvConfigProvider,
} from "effect-dotenv";

import * as Either from "@effect/data/Either";
import { pipe } from "@effect/data/Function";
import * as Config from "@effect/io/Config";
import * as Effect from "@effect/io/Effect";
import * as Layer from "@effect/io/Layer";

import { modifyEnv, withTmpDotEnvFile } from "./utils";

const exampleConfig = Config.all({
  value: Config.string("VALUE"),
  number: Config.number("NUMBER"),
});

const readExampleConfig = (envFilePath: string) =>
  pipe(
    Effect.config(exampleConfig),
    Effect.provideSomeLayer(setDotEnvConfigProvider(envFilePath)),
  );

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
    Effect.config(exampleConfig),
    Effect.provideSomeLayer(
      pipe(
        dotEnvConfigProvider(".non-existing-env-file"),
        Effect.map(Effect.setConfigProvider),
        Layer.unwrapEffect,
      ),
    ),
  );

  const result = await Effect.runPromise(Effect.either(program));
  const expectedResult = Either.left(
    new NoAvailableDotEnvFileError({
      files: [".non-existing-env-file"],
      error: new Error(
        "ENOENT: no such file or directory, open '.non-existing-env-file'",
      ),
    }),
  );

  expect(result).toMatchObject(expectedResult);
});
