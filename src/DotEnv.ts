/**
 * dotenv ConfigProvider
 *
 * @since 1.0.0
 */
import * as FileSystem from "@effect/platform/FileSystem"
import * as dotenv from "dotenv"
import type { Cause } from "effect"
import {
  ConfigProvider,
  Context,
  Data,
  DefaultServices,
  Effect,
  FiberRef,
  Layer,
  Match,
  pipe,
  ReadonlyArray
} from "effect"
import { expand } from "./internal/expand.js"

/**
 * @category errors
 * @since 1.0.0
 */
export interface NoAvailableDotEnvFileError extends Cause.YieldableError {
  _tag: "NoAvailableDotEnvFileError"
  files: ReadonlyArray<string>
  error: unknown
}

class NoAvailableDotEnvFileErrorImpl extends Data.TaggedError(
  "NoAvailableDotEnvFileError"
)<{ files: ReadonlyArray<string>; error: unknown }> implements NoAvailableDotEnvFileError {}

/** @internal */
const currentConfigProvider = pipe(
  FiberRef.get(DefaultServices.currentServices),
  Effect.map((services) => Context.get(services, ConfigProvider.ConfigProvider))
)

/** @internal */
const pathFromInput = pipe(
  Match.type<string | ReadonlyArray<string> | undefined>(),
  Match.when(Match.undefined, () => ReadonlyArray.of(".env")),
  Match.when(Match.string, (path) => ReadonlyArray.of(path)),
  Match.orElse((paths) => paths)
)

const { readFileString } = Effect.serviceFunctions(FileSystem.FileSystem)

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
export const makeConfigProvider: (
  paths?: string | ReadonlyArray<string>
) => Effect.Effect<
  ConfigProvider.ConfigProvider,
  NoAvailableDotEnvFileError,
  FileSystem.FileSystem
> = (paths) => {
  const files = pathFromInput(paths)

  return pipe(
    ReadonlyArray.map(files, (path) => readFileString(path)),
    Effect.firstSuccessOf,
    Effect.mapError(
      (error) => new NoAvailableDotEnvFileErrorImpl({ files, error })
    ),
    Effect.flatMap((content) => Effect.sync(() => expand(dotenv.parse(content)))),
    Effect.map(ConfigProvider.fromJson)
  )
}

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
export const setConfigProvider: (paths?: string | ReadonlyArray<string>) => Layer.Layer<
  never,
  never,
  FileSystem.FileSystem
> = (paths) =>
  pipe(
    makeConfigProvider(paths),
    Effect.flatMap((dotEnvConfigProvider) =>
      pipe(
        currentConfigProvider,
        Effect.map(ConfigProvider.orElse(() => dotEnvConfigProvider))
      )
    ),
    Effect.catchTag("NoAvailableDotEnvFileError", () => currentConfigProvider),
    Effect.map(Layer.setConfigProvider),
    Layer.unwrapEffect
  )
