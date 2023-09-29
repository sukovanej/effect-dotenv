import { Effect, pipe } from "effect";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const withTmpDir = (prefix: string) =>
  Effect.acquireRelease(
    Effect.promise(() => promisify(fs.mkdtemp)(prefix)),
    (path) => Effect.promise(() => promisify(fs.rmdir)(path)),
  );

export const withTmpDotEnvFile = <R, E, A>(
  data: string,
  fn: (path: string) => Effect.Effect<R, E, A>,
) =>
  pipe(
    withTmpDir("tmp"),
    Effect.tap((dir) =>
      Effect.acquireRelease(
        Effect.promise(() =>
          promisify(fs.writeFile)(path.join(dir, ".env"), data),
        ),
        () => Effect.promise(() => promisify(fs.rm)(path.join(dir, ".env"))),
      ),
    ),
    Effect.map((dir) => path.join(dir, ".env")),
    Effect.flatMap(fn),
    Effect.scoped,
  );

export const modifyEnv = (key: string, value: string) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const original = process.env[key];
      process.env[key] = value;
      return original;
    }),
    (original) =>
      Effect.sync(() => {
        process.env[key] = original;
      }),
  );
