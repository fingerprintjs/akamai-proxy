import rulesTemplate from '../assets/rulesTemplate.json'
import rulePatch from '../assets/patch-body/patchBodyAddRule.json'
import variablePatch from '../assets/patch-body/patchBodyAddVariable.json'
import variables from '../assets/variables.json'
import packageJSON from '../package.json'

interface PatchBodyOptions {
  integrationPath?: string
  agentPath?: string
  resultPath?: string
  proxySecret?: string
  ingressUrl: string
}
export default function generatePatchBody({
  integrationPath = 'integration',
  agentPath = 'proxyagent',
  resultPath = 'proxyresult',
  proxySecret = '',
  ingressUrl,
}: PatchBodyOptions) {
  const body: unknown[] = [{ ...rulePatch, value: rulesTemplate }]
  for (const variable of variables) {
    body.push({
      ...variablePatch,
      value: variable,
    })
  }

  let bodyString = JSON.stringify(body, null, 2)
  bodyString = bodyString.replace(/__integration_path__/g, integrationPath)
  bodyString = bodyString.replace(/__integration_path_escaped__/g, integrationPath?.replace('/', '\\\\/'))
  bodyString = bodyString.replace(/__agent_path__/g, agentPath)
  bodyString = bodyString.replace(/__result_path__/g, resultPath)
  bodyString = bodyString.replace(/__proxy_secret__/g, proxySecret)
  bodyString = bodyString.replace(/__ingress_url__/g, ingressUrl)
  bodyString = bodyString.replace(/__integration_version__/g, packageJSON.version)

  return bodyString
}
