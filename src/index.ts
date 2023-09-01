import * as dotenv from "dotenv";
import fs from "fs";
import { promisify } from "util";

import * as Context from "@effect/data/Context";
import * as Data from "@effect/data/Data";
import { pipe } from "@effect/data/Function";
import * as RA from "@effect/data/ReadonlyArray";
import * as ConfigProvider from "@effect/io/ConfigProvider";
import * as DefaultServices from "@effect/io/DefaultServices";
import * as Effect from "@effect/io/Effect";
import * as FiberRef from "@effect/io/FiberRef";
import * as Layer from "@effect/io/Layer";

/**
 * @category errors
 * @since 1.0.0
 */
export class NoAvailableDotEnvFileError extends Data.TaggedClass(
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
export const dotEnvConfigProvider = (paths?: string | readonly string[]) => {
  const files =
    typeof paths === "string"
      ? [paths]
      : paths === undefined
      ? [".env"]
      : paths;

  return pipe(
    RA.map(files, (path) =>
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
export const setDotEnvConfigProvider = (paths?: string | readonly string[]) =>
  pipe(
    dotEnvConfigProvider(paths),
    Effect.flatMap((dotEnvConfigProvider) =>
      pipe(
        currentConfigProvider,
        Effect.map(ConfigProvider.orElse(() => dotEnvConfigProvider)),
      ),
    ),
    Effect.catchTag("NoAvailableDotEnvFileError", () => currentConfigProvider),
    Effect.map(Effect.setConfigProvider),
    Layer.unwrapEffect,
  );
