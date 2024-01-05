// Taken from https://github.com/motdotla/dotenv-expand/blob/master/lib/main.js
import * as dotenv from "dotenv";

function _searchLast(str: string, rgx: RegExp) {
  const matches = Array.from(str.matchAll(rgx));
  return matches.length > 0 ? matches.slice(-1)[0].index : -1;
}

function _interpolate(envValue: string, parsed: dotenv.DotenvParseOutput) {
  // find the last unescaped dollar sign in the
  // value so that we can evaluate it
  const lastUnescapedDollarSignIndex = _searchLast(envValue, /(?!(?<=\\))\$/g);

  // If we couldn't match any unescaped dollar sign
  // let's return the string as is
  if (lastUnescapedDollarSignIndex === -1) return envValue;

  // This is the right-most group of variables in the string
  const rightMostGroup = envValue.slice(lastUnescapedDollarSignIndex);

  /**
   * This finds the inner most variable/group divided
   * by variable name and default value (if present)
   * (
   *   (?!(?<=\\))\$        // only match dollar signs that are not escaped
   *   {?                   // optional opening curly brace
   *     ([\w]+)            // match the variable name
   *     (?::-([^}\\]*))?   // match an optional default value
   *   }?                   // optional closing curly brace
   * )
   */
  const matchGroup = /((?!(?<=\\))\${?([\w]+)(?::-([^}\\]*))?}?)/;
  const match = rightMostGroup.match(matchGroup);

  if (match != null) {
    const [, group, variableName, defaultValue] = match;

    return _interpolate(
      envValue.replace(group, defaultValue || parsed[variableName] || ""),
      parsed,
    );
  }

  return envValue;
}

function _resolveEscapeSequences(value: string) {
  return value.replace(/\\\$/g, "$");
}

export function expand(parsed: dotenv.DotenvParseOutput) {
  const newParsed: dotenv.DotenvParseOutput = {};

  for (const configKey in parsed) {
    newParsed[configKey] = _resolveEscapeSequences(
      _interpolate(parsed[configKey], parsed),
    );
  }

  return newParsed;
}
