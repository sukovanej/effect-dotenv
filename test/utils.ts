import { FileSystem, Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import type { Config } from "effect"
import { Effect, Layer, pipe } from "effect"
import { DotEnv } from "effect-dotenv"

const { makeTempDirectoryScoped, writeFileString } = Effect.serviceFunctions(FileSystem.FileSystem)
const join = Effect.serviceFunction(Path.Path, (path) => path.join)

const createTmpEnvFileTest = (data: string) =>
  pipe(
    makeTempDirectoryScoped({ prefix: "tmp" }),
    Effect.flatMap((dir) => join(dir, ".env")),
    Effect.tap((filename) => writeFileString(filename, data))
  )

export const runWithTestDotEnv = <A>(data: string, config: Config.Config<A>) =>
  pipe(
    config,
    Effect.provide(
      pipe(
        createTmpEnvFileTest(data),
        Effect.map((envFile) => DotEnv.setConfigProvider(envFile)),
        Layer.unwrapScoped
      )
    ),
    Effect.provide(NodeContext.layer)
  )

export const modifyEnv = (key: string, value: string) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const original = process.env[key]
      process.env[key] = value
      return original
    }),
    (original) =>
      Effect.sync(() => {
        process.env[key] = original
      })
  )
