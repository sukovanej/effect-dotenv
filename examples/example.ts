import { NodeContext } from "@effect/platform-node"
import { Config, Effect, pipe } from "effect"
import { DotEnv } from "effect-dotenv"

const exampleConfig = Config.all({
  value: Config.string("VALUE")
})

const program = pipe(
  exampleConfig,
  Effect.flatMap((config) => Effect.log(`value = ${config.value}`)),
  Effect.provide(DotEnv.layerAsFallback(".env")),
  Effect.provide(NodeContext.layer)
)

Effect.runPromise(program)
