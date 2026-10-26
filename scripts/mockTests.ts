import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'node:path'

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))

function getEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

async function main() {
  const apiUrl = getEnv('API_URL')
  const agentPath = `${getEnv('INTEGRATION_PATH')}/${getEnv('AGENT_PATH')}`
  const resultPath = `${getEnv('INTEGRATION_PATH')}/${getEnv('RESULT_PATH')}`
  const host = getEnv('TEST_DOMAIN')

  const agentUrl = new URL(host)
  agentUrl.pathname = agentPath

  const resultUrl = new URL(host)
  resultUrl.pathname = resultPath

  console.info('Agent download path:', agentPath)
  console.info('Get result path:', resultPath)

  console.info(`Running mock e2e tests for`, host)

  execSync(
    `npm exec -y "git+https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests.git" -- --api-url="https://${apiUrl}" --cdn-proxy-url="${agentUrl.toString()}" --ingress-proxy-url="${resultUrl.toString()}" --traffic-name=fingerprint-pro-akamai --agent-cache-mode=cached --enable-new-tests=true --integration-version=${
      pkg.version
    }`,
    {
      stdio: 'inherit',
    }
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
