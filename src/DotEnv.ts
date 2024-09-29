/**
 * .env ConfigProvider
 *
 * Based on
 * - https://github.com/motdotla/dotenv
 * - https://github.com/motdotla/dotenv-expand
 *
 * @since 1.0.0
 */
import type { PlatformError } from "@effect/platform/Error"
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as ConfigProvider from "effect/ConfigProvider"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/dotenv.js"

/**
 * Create a dotenv ConfigProvider.
 *
 * @category constructors
 * @since 1.0.0
 */
export const makeConfigProvider: (
  paths: string
) => Effect.Effect<ConfigProvider.ConfigProvider, PlatformError, FileSystem.FileSystem> = internal.makeConfigProvider

/**
 * Replace the current ConfigProvider with a dotenv ConfigProvider.
 *
 * @category constructors
 * @since 1.0.0
 */
export const layer: (paths: string) => Layer.Layer<never, PlatformError, FileSystem.FileSystem> = internal.layer

/**
 * Use dotenv ConfigProvider as a fallback to the current ConfigProvider.
 *
 * @category constructors
 * @since 1.0.0
 */
export const layerAsFallback: (path: string) => Layer.Layer<never, PlatformError, FileSystem.FileSystem> =
  internal.layerAsFallback
