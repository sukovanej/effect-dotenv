import * as dotenv from "dotenv";
import {
  ConfigProvider,
  Context,
  Data,
  DefaultServices,
  Effect,
  FiberRef,
  Layer,
  ReadonlyArray,
  pipe,
} from "effect";
import fs from "fs";
import { promisify } from "util";

/**
 * @category errors
 * @since 1.0.0
 */
export class NoAvailableDotEnvFileError extends Data.TaggedError(
  "NoAvailableDotEnvFileError",
)<{ files: readonly string[]; error: unknown }> {}

/** @internal */
const currentConfigProvider = pipe(
  FiberRef.get(DefaultServices.currentServices),
  Effect.map((services) =>
    Context.get(services, ConfigProvider.ConfigProvider),
  ),
);

/**
 * Create a dotenv config provider.
 *
 * The input argument can be either a path to the .env file,
 * list of .env files where order determine the preference, or
 * it can be ommited in which case the default `.env` is used.
 *
 * @category constructors
 * @since 1.0.0
 */
export const makeConfigProvider = (paths?: string | readonly string[]) => {
  const files =
    typeof paths === "string"
      ? [paths]
      : paths === undefined
      ? [".env"]
      : paths;

  return pipe(
    ReadonlyArray.map(files, (path) =>
      Effect.all([
        Effect.tryPromise(() => promisify(fs.readFile)(path)),
        Effect.succeed(path),
      ]),
    ),
    Effect.firstSuccessOf,
    Effect.mapError(
      (error) => new NoAvailableDotEnvFileError({ files, error }),
    ),
    Effect.flatMap(([buffer, path]) =>
      pipe(
        Effect.sync(() => dotenv.parse(buffer.toString("utf8"))),
        Effect.map((env) => [env, path] as const),
      ),
    ),
    Effect.map(([object]) =>
      ConfigProvider.fromMap(new Map(Object.entries(object))),
    ),
  );
};

/**
 * Create a layer that sets the ConfigProvider to dotenv config provider
 * as a fallback to the current ConfigProvider.
 *
 * The input argument can be either a path to the .env file,
 * list of .env files where order determine the preference, or
 * it can be ommited in which case the default `.env` is used.
 *
 * The current config provider (process env by default) takes
 * precendence over the dotenv provider.
 *
 * @category constructors
 * @since 1.0.0
 */
export const setConfigProvider = (paths?: string | readonly string[]) =>
  pipe(
    makeConfigProvider(paths),
    Effect.flatMap((dotEnvConfigProvider) =>
      pipe(
        currentConfigProvider,
        Effect.map(ConfigProvider.orElse(() => dotEnvConfigProvider)),
      ),
    ),
    Effect.catchTag("NoAvailableDotEnvFileError", () => currentConfigProvider),
    Effect.map(Layer.setConfigProvider),
    Layer.unwrapEffect,
  );
