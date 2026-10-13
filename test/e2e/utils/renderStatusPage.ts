import generatePatchBody from '../../../generators/generatePatchBody.ts'

interface Config {
  integrationPath: string
  agentPath: string
  resultPath: string
  proxySecret: string
}

interface Behavior {
  name: string
  options: Record<string, any>
}

interface Criteria {
  name: string
  options: Record<string, any>
}

interface Rule {
  name: string
  behaviors: Behavior[]
  criteria: Criteria[]
  children: Rule[]
}

/**
 * Renders the status page the way the Akamai edge does, without deploying anything.
 *
 * It builds the property rules for the given configuration and evaluates the root variables and the `Status Path`
 * rule tree in order. It only understands what the status page uses, and throws on anything else, so a change to the
 * rules that needs more of Akamai's semantics fails loudly instead of being silently skipped.
 */
export function renderStatusPage(config: Config): string {
  const patchBody = JSON.parse(generatePatchBody({ ...config, ingressUrl: 'api.fpjs.io' })) as {
    value: Rule | { name: string; value: string }
  }[]

  const variables = new Map<string, string>()
  for (const { value } of patchBody.slice(1)) {
    const variable = value as { name: string; value: string }
    variables.set(variable.name, variable.value)
  }

  const root = patchBody[0].value as Rule
  const statusPath = root.children.find((rule) => rule.name === 'Status Path')
  if (!statusPath) {
    throw new Error('Status Path rule not found')
  }

  const expand = (expression: string) =>
    expression.replace(/{{user\.(\w+)}}/g, (_match, name: string) => variables.get(name) ?? '')

  let body: string | undefined

  const matches = ({ name, options }: Criteria) => {
    if (name !== 'matchVariable' || !['IS', 'IS_NOT'].includes(options.matchOperator)) {
      throw new Error(`Unsupported criteria: ${name} ${options.matchOperator}`)
    }
    const equal = (variables.get(options.variableName) ?? '') === expand(options.variableExpression)
    return options.matchOperator === 'IS' ? equal : !equal
  }

  const run = ({ name, options }: Behavior) => {
    switch (name) {
      case 'setVariable': {
        if (options.valueSource === 'GENERATE') {
          variables.set(options.variableName, '0'.repeat(32))
          break
        }
        if (options.valueSource !== 'EXPRESSION') {
          throw new Error(`Unsupported variable source: ${options.valueSource}`)
        }
        const value = expand(options.variableValue)
        if (options.transform === 'STRING_LENGTH') {
          variables.set(options.variableName, String(value.length))
        } else if (options.transform === 'NONE') {
          variables.set(options.variableName, value)
        } else {
          throw new Error(`Unsupported transform: ${options.transform}`)
        }
        break
      }
      case 'constructResponse':
        body = expand(options.body)
        break
      case 'modifyOutgoingResponseHeader':
        break
      default:
        throw new Error(`Unsupported behavior: ${name}`)
    }
  }

  const evaluate = (rule: Rule) => {
    if (!rule.criteria.every(matches)) {
      return
    }
    rule.behaviors.forEach(run)
    rule.children.forEach(evaluate)
  }

  // The root rule only matters here for the variables it sets
  root.behaviors.filter((behavior) => behavior.name === 'setVariable').forEach(run)
  // The request is for the status path, so that rule's own path criteria are met by definition
  statusPath.behaviors.forEach(run)
  statusPath.children.forEach(evaluate)

  if (body === undefined) {
    throw new Error('The status page was not constructed')
  }

  return body
}
