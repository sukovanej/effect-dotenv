import * as dotenv from "dotenv";
import fs from "fs";
import { promisify } from "util";

import * as Context from "@effect/data/Context";
import { pipe } from "@effect/data/Function";
import * as RA from "@effect/data/ReadonlyArray";
import * as ConfigProvider from "@effect/io/Config/Provider";
import * as DefaultServices from "@effect/io/DefaultServices";
import * as Effect from "@effect/io/Effect";
import * as FiberRef from "@effect/io/FiberRef";
import * as Layer from "@effect/io/Layer";

/**
 * @category models
 * @since 1.0.0
 */
export type EnvFileError = {
  _tag: "EnvFileError";
  message: string;
  error: unknown;
};

/** @internal */
export const envFileError = (message: string, error: unknown): EnvFileError =>
  ({ _tag: "EnvFileError", message, error }) as const;

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
 * @category constructors
 * @since 1.0.0
 */
export const dotEnvConfigProvider = (paths: string | readonly string[]) =>
  pipe(
    Effect.firstSuccessOf(
      pipe(
        typeof paths === "string" ? [paths] : paths,
        RA.map((path) =>
          Effect.all([
            Effect.tryPromise(() => promisify(fs.readFile)(path)),
            Effect.succeed(path),
          ]),
        ),
      ),
    ),
    Effect.mapError((error) =>
      envFileError(`No dotenv file found, tried "${paths}"`, error),
    ),
    Effect.flatMap(([buffer, path]) =>
      pipe(
        Effect.try(() => dotenv.parse(buffer.toString("utf8"))),
        Effect.mapError((error) =>
          envFileError(`Failed to parse ${path}`, error),
        ),
        Effect.map((env) => [env, path] as const),
      ),
    ),
    Effect.map(([object]) =>
      ConfigProvider.fromMap(new Map(Object.entries(object))),
    ),
  );

/**
 * Create a layer that sets the ConfigProvider to dotenv provider.
 *
 * The current config provider (process env by default) takes
 * precendence over the dotenv provider.
 *
 * @category constructors
 * @since 1.0.0
 */
export const setDotEnvConfigProvider = (paths: string | readonly string[]) =>
  pipe(
    dotEnvConfigProvider(paths),
    Effect.flatMap((dotEnvConfigProvider) =>
      pipe(
        currentConfigProvider,
        Effect.map(ConfigProvider.orElse(() => dotEnvConfigProvider)),
      ),
    ),
    Effect.catchAll(() => currentConfigProvider),
    Effect.map(Effect.setConfigProvider),
    Layer.unwrapEffect,
  );
