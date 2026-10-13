import { test } from '@playwright/test'
import { renderStatusPage } from './utils/renderStatusPage.ts'

// Real deployments can't change their configuration during a test run, so the misconfigured states of the status page
// are checked by rendering the property rules for different configurations. The e2e tests in `statusPage.spec.ts`
// cover the configured state on the deployed property.

const complete = {
  integrationPath: 'integration',
  agentPath: 'agent',
  resultPath: 'result',
  proxySecret: 'super-secret-value',
}

const PRESENT = 'present &#9989;'
const ERROR = '&#10060;'
const WARNING = '&#9888;&#65039;'

const configured = (page: string) => page.includes('Status: <strong>Configured</strong>')

const apiState = (page: string, version: 'APIv3' | 'APIv4') =>
  page.match(new RegExp(`<li>${version}: ([^<]*)</li>`))?.[1]

const valueState = (page: string, name: string) =>
  page.match(new RegExp(`<code>${name}</code> \\(required for [^)]*\\) is ([^<]*)</li>`))?.[1]

test.describe('Status page rules', () => {
  test('report a complete setup as configured', () => {
    const page = renderStatusPage(complete)

    test.expect(configured(page)).toBe(true)
    test.expect(apiState(page, 'APIv4')).toBe('Configured &#9989;')
    test.expect(apiState(page, 'APIv3')).toBe('Configured &#9989;')
    for (const name of ['proxy_secret', 'integration_path', 'agent_path', 'result_path']) {
      test.expect(valueState(page, name)).toBe(PRESENT)
    }
  })

  for (const [missing, name] of [
    ['agentPath', 'agent_path'],
    ['resultPath', 'result_path'],
  ] as const) {
    test(`warn about APIv3 only when ${name} is missing`, () => {
      const page = renderStatusPage({ ...complete, [missing]: '' })

      test.expect(configured(page)).toBe(true)
      test.expect(apiState(page, 'APIv4')).toBe('Configured &#9989;')
      test.expect(apiState(page, 'APIv3')).toContain(`Misconfigured ${WARNING}`)
      test.expect(valueState(page, name)).toBe(`missing ${WARNING}`)
    })
  }

  test('warn about both APIv3 values when they are missing', () => {
    const page = renderStatusPage({ ...complete, agentPath: '', resultPath: '' })

    test.expect(configured(page)).toBe(true)
    test.expect(apiState(page, 'APIv3')).toContain(`Misconfigured ${WARNING}`)
    test.expect(valueState(page, 'agent_path')).toBe(`missing ${WARNING}`)
    test.expect(valueState(page, 'result_path')).toBe(`missing ${WARNING}`)
    test.expect(valueState(page, 'proxy_secret')).toBe(PRESENT)
    test.expect(valueState(page, 'integration_path')).toBe(PRESENT)
  })

  for (const [missing, name] of [
    ['proxySecret', 'proxy_secret'],
    ['integrationPath', 'integration_path'],
  ] as const) {
    test(`report an error for APIv4 and APIv3 when ${name} is missing`, () => {
      const page = renderStatusPage({ ...complete, [missing]: '' })

      test.expect(configured(page)).toBe(false)
      test.expect(page).toContain('Status: <strong>Misconfigured</strong>')
      test.expect(apiState(page, 'APIv4')).toContain(`Misconfigured ${ERROR}`)
      test.expect(apiState(page, 'APIv3')).toContain(`Misconfigured ${ERROR}`)
      test.expect(valueState(page, name)).toBe(`missing ${ERROR}`)
    })
  }

  test('keep the severity of each missing value when several are missing', () => {
    const page = renderStatusPage({ ...complete, proxySecret: '', agentPath: '' })

    test.expect(configured(page)).toBe(false)
    test.expect(apiState(page, 'APIv4')).toContain(`Misconfigured ${ERROR}`)
    test.expect(apiState(page, 'APIv3')).toContain(`Misconfigured ${ERROR}`)
    test.expect(valueState(page, 'proxy_secret')).toBe(`missing ${ERROR}`)
    test.expect(valueState(page, 'agent_path')).toBe(`missing ${WARNING}`)
    test.expect(valueState(page, 'result_path')).toBe(PRESENT)
    test.expect(valueState(page, 'integration_path')).toBe(PRESENT)
  })

  test('never expose configuration values', () => {
    // Distinctive values, as the page legitimately mentions words like "integration" and "agent"
    const values = {
      integrationPath: 'qx7integrationvalue',
      agentPath: 'qx7agentvalue',
      resultPath: 'qx7resultvalue',
      proxySecret: 'qx7secretvalue',
    }
    const page = renderStatusPage(values)

    test.expect(configured(page)).toBe(true)
    for (const value of Object.values(values)) {
      test.expect(page).not.toContain(value)
    }
    test.expect(page).not.toContain('{{')
  })
})
