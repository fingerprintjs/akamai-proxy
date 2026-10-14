import generatePatchBody from '../../../generators/generatePatchBody.ts'

interface Config {
  proxySecret: string
  resultPath: string
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

// Akamai refuses to activate rules with an empty integration path or agent path, so they are not part of the config:
// this helper must not be able to render a state that can't exist on a real property.
const integrationPath = 'integration'
const agentPath = 'agent'

/**
 * Renders the status page the way the Akamai edge does, without deploying anything.
 *
 * It builds the property rules for the given configuration and evaluates the root variables and the `Status Path`
 * rule tree in order. This is a small model of Akamai's rule engine, limited to what the status page uses: it throws
 * on anything else, so a rule change that needs more of Akamai's semantics fails loudly instead of being skipped.
 * Its results were checked against pages served by a real Akamai property for the same configurations.
 */
export function renderStatusPage({ proxySecret, resultPath }: Config): string {
  const patchBody = JSON.parse(
    generatePatchBody({ integrationPath, agentPath, resultPath, proxySecret, ingressUrl: 'api.fpjs.io' })
  ) as { value: Rule | { name: string; value: string } }[]

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
    if (name !== 'matchVariable' || !['IS_EMPTY', 'IS_NOT_EMPTY'].includes(options.matchOperator)) {
      throw new Error(`Unsupported criteria: ${name} ${options.matchOperator}`)
    }
    const empty = (variables.get(options.variableName) ?? '') === ''
    return options.matchOperator === 'IS_EMPTY' ? empty : !empty
  }

  const run = ({ name, options }: Behavior) => {
    switch (name) {
      case 'setVariable':
        if (options.transform !== 'NONE') {
          throw new Error(`Unsupported transform: ${options.transform}`)
        }
        if (options.valueSource === 'GENERATE') {
          variables.set(options.variableName, '0'.repeat(32))
        } else if (options.valueSource === 'EXPRESSION') {
          variables.set(options.variableName, expand(options.variableValue))
        } else {
          throw new Error(`Unsupported variable source: ${options.valueSource}`)
        }
        break
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
