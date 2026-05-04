import rulesTemplate from '../assets/rulesTemplate.json'
import variablesTemplate from '../assets/variables.json'
import packageJSON from '../package.json'

interface TerraformOptions {
  ingressUrl: string
}

export default function generateTerraformPropertyRules(options: TerraformOptions) {
  const [rulesBody, variablesBody] = [rulesTemplate, variablesTemplate].map((file) => {
    let bodyString = JSON.stringify(file, null, 2)
    bodyString = bodyString.replace(/__integration_path__/g, '${env.fpjs_integration_path}')
    bodyString = bodyString.replace(/__integration_path_escaped__/g, '${env.fpjs_integration_path_escaped}')
    bodyString = bodyString.replace(/__agent_path__/g, '${env.fpjs_agent_path}')
    bodyString = bodyString.replace(/__result_path__/g, '${env.fpjs_result_path}')
    bodyString = bodyString.replace(/__proxy_secret__/g, '${env.fpjs_proxy_secret}')
    bodyString = bodyString.replace(/__ingress_url__/g, options.ingressUrl)
    bodyString = bodyString.replace(/__integration_version__/g, packageJSON.version)

    return bodyString
  })

  return {
    rulesBody,
    variablesBody,
  }
}
