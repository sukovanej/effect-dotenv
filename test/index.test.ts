import { NodeContext } from "@effect/platform-node"
import { Config, Effect, Either, Layer, pipe } from "effect"
import { DotEnv } from "effect-dotenv"
import { expect, test } from "vitest"

import { modifyEnv, runWithTestDotEnv } from "./utils.js"

const exampleConfig = Config.all({
  value: Config.string("VALUE"),
  number: Config.number("NUMBER")
})

const readExampleConfig = (envFilePath: string) =>
  pipe(
    exampleConfig,
    Effect.provide(DotEnv.setConfigProvider(envFilePath)),
    Effect.provide(NodeContext.layer)
  )

test("Load from env file", async () => {
  const program = runWithTestDotEnv(
    "VALUE=hello\nNUMBER=69",
    exampleConfig
  )

  const result = await Effect.runPromise(program)

  expect(result).toEqual({ value: "hello", number: 69 })
})

// TODO - fails in Bun
test.skip("Expand variables", async () => {
  const program = runWithTestDotEnv(
    "VALUE=hello-${NUMBER}\nNUMBER=69",
    exampleConfig
  )

  const result = await Effect.runPromise(program)

  expect(result).toEqual({ value: "hello-69", number: 69 })
})

test("Load from process env if the env file doesn't exist", async () => {
  const program = pipe(
    Effect.all([modifyEnv("VALUE", "hello"), modifyEnv("NUMBER", "69")]),
    Effect.flatMap(() => readExampleConfig(".env")),
    Effect.scoped
  )

  const result = await Effect.runPromise(program)

  expect(result).toEqual({ value: "hello", number: 69 })
})

test("Load from both process env and dotenv file", async () => {
  const program = pipe(
    modifyEnv("VALUE", "hello"),
    Effect.andThen(runWithTestDotEnv("NUMBER=69", exampleConfig)),
    Effect.scoped
  )

  const result = await Effect.runPromise(program)

  expect(result).toEqual({ value: "hello", number: 69 })
})

test("Process env has precedence over dotenv", async () => {
  const program = pipe(
    modifyEnv("VALUE", "hello"),
    Effect.andThen(runWithTestDotEnv("NUMBER=69\nVALUE=another", exampleConfig)),
    Effect.scoped
  )

  const result = await Effect.runPromise(program)

  expect(result).toEqual({ value: "hello", number: 69 })
})

test("Dotnet config provider fails if no .env file is found", async () => {
  const program = pipe(
    exampleConfig,
    Effect.provide(
      pipe(
        DotEnv.makeConfigProvider(".non-existing-env-file"),
        Effect.map(Layer.setConfigProvider),
        Layer.unwrapEffect
      )
    )
  )

  const result = await Effect.runPromise(Effect.either(program).pipe(Effect.provide(NodeContext.layer)))
  expect(Either.isLeft(result)).toBe(true)

  const resultError = (
    result as Either.Left<DotEnv.NoAvailableDotEnvFileError, never>
  ).left

  expect(resultError.files).toEqual([".non-existing-env-file"])
})
