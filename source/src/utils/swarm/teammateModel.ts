import { getResolvedMainLoopModelForActiveProvider } from '../model/model.js'

// When the user has never set teammateDefaultModel in /config, fall back to the
// active provider's default main-loop model. Teammates must never silently
// route out of the selected provider runtime.
export function getHardcodedTeammateModelFallback(): string {
  return getResolvedMainLoopModelForActiveProvider()
}
