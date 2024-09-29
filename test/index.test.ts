import { FileSystem, Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { expect, it } from "@effect/vitest"
import { Config, Effect, Either } from "effect"
import { DotEnv } from "effect-dotenv"

const ExampleConfig = Config.all({
  value: Config.string("VALUE"),
  number: Config.number("NUMBER")
})

it.scopedLive.each([
  {
    name: "Simple variables",
    config: ExampleConfig,
    content: "VALUE=hello\nNUMBER=69",
    expected: { value: "hello", number: 69 }
  },
  {
    name: "Whitespaces",
    config: ExampleConfig,
    content: "VALUE= hello  \n NUMBER= 69 \n\n",
    expected: { value: "hello", number: 69 }
  },
  {
    name: "Quotes",
    config: Config.all({
      value: Config.string("VALUE"),
      anotherValue: Config.string("ANOTHER_VALUE")
    }),
    content: "VALUE=\" hello  \"\nANOTHER_VALUE=' another   '",
    expected: { value: " hello  ", anotherValue: " another   " }
  },
  {
    name: "Expand",
    config: ExampleConfig,
    content: "VALUE=hello-${NUMBER}\nNUMBER=69",
    expected: { value: "hello-69", number: 69 }
  }
])("Dot env parsing ($name)", ({ config, content, expected }) =>
  Effect.gen(function*(_) {
    const envFile = yield* createTmpEnvFile(content)
    const result = yield* (config as Config.Config<unknown>).pipe(
      Effect.provide(DotEnv.layer(envFile))
    )
    expect(result).toEqual(expected)
  }).pipe(Effect.provide(NodeContext.layer)))

it.scopedLive("Load from both process env and dotenv file", () =>
  Effect.gen(function*(_) {
    yield* modifyEnv("VALUE", "hello")
    const envFile = yield* createTmpEnvFile("NUMBER=69")
    const result = yield* ExampleConfig.pipe(
      Effect.provide(DotEnv.layerAsFallback(envFile))
    )
    expect(result).toEqual({ value: "hello", number: 69 })
  }).pipe(Effect.provide(NodeContext.layer)))

it.scopedLive("Current ConfigProvider has precedence over dotenv", () =>
  Effect.gen(function*(_) {
    yield* modifyEnv("VALUE", "hello")
    const envFile = yield* createTmpEnvFile("NUMBER=69\nVALUE=another")
    const result = yield* ExampleConfig.pipe(
      Effect.provide(DotEnv.layerAsFallback(envFile))
    )
    expect(result).toEqual({ value: "hello", number: 69 })
  }).pipe(Effect.provide(NodeContext.layer)))

it.scopedLive("Dotnet config provider fails if no .env file is found", () =>
  Effect.gen(function*(_) {
    const result = yield* DotEnv.makeConfigProvider(".non-existing-env-file").pipe(Effect.either)
    expect(Either.isLeft(result)).toBe(true)
  }).pipe(Effect.provide(NodeContext.layer)))

// utils

const createTmpEnvFile = (data: string) =>
  Effect.gen(function*(_) {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const dir = yield* fs.makeTempDirectoryScoped({ prefix: "tmp" })
    const filename = path.join(dir, ".env")
    yield* fs.writeFileString(filename, data)
    return filename
  })

const modifyEnv = (key: string, value: string) =>
  Effect.gen(function*(_) {
    const isInEnv = key in process.env
    const original = process.env[key]
    process.env[key] = value

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        if (isInEnv) {
          process.env[key] = original
        } else {
          delete process.env[key]
        }
      })
    )
  })
