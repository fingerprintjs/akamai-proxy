import { test } from '@playwright/test'
import { renderStatusPage } from './utils/renderStatusPage.ts'

// Real deployments can't change their configuration during a test run, so the misconfigured states of the status page
// are checked by rendering the property rules for different configurations. The e2e tests in `statusPage.spec.ts`
// cover the configured state on the deployed property.
//
// Only `proxy_secret` and `result_path` can be missing on a real property: Akamai refuses to activate rules with an
// empty integration path or agent path, so those are not reported and not covered here.

const complete = {
  proxySecret: 'super-secret-value',
  resultPath: 'result',
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
    test.expect(valueState(page, 'proxy_secret')).toBe(PRESENT)
    test.expect(valueState(page, 'result_path')).toBe(PRESENT)
  })

  test('warn about APIv3 only when result_path is missing', () => {
    const page = renderStatusPage({ ...complete, resultPath: '' })

    test.expect(configured(page)).toBe(true)
    test.expect(apiState(page, 'APIv4')).toBe('Configured &#9989;')
    test.expect(apiState(page, 'APIv3')).toContain(`Misconfigured ${WARNING}`)
    test.expect(valueState(page, 'proxy_secret')).toBe(PRESENT)
    test.expect(valueState(page, 'result_path')).toBe(`missing ${WARNING}`)
  })

  test('report an error for APIv4 and APIv3 when proxy_secret is missing', () => {
    const page = renderStatusPage({ ...complete, proxySecret: '' })

    test.expect(configured(page)).toBe(false)
    test.expect(page).toContain('Status: <strong>Misconfigured</strong>')
    test.expect(apiState(page, 'APIv4')).toContain(`Misconfigured ${ERROR}`)
    test.expect(apiState(page, 'APIv3')).toContain(`Misconfigured ${ERROR}`)
    test.expect(valueState(page, 'proxy_secret')).toBe(`missing ${ERROR}`)
    test.expect(valueState(page, 'result_path')).toBe(PRESENT)
  })

  test('report an error, not a warning, when both values are missing', () => {
    const page = renderStatusPage({ proxySecret: '', resultPath: '' })

    test.expect(configured(page)).toBe(false)
    test.expect(apiState(page, 'APIv4')).toContain(`Misconfigured ${ERROR}`)
    test.expect(apiState(page, 'APIv3')).toContain(`Misconfigured ${ERROR}`)
    test.expect(valueState(page, 'proxy_secret')).toBe(`missing ${ERROR}`)
    test.expect(valueState(page, 'result_path')).toBe(`missing ${WARNING}`)
  })

  test('never expose configuration values', () => {
    // Distinctive values, as the page legitimately mentions words like "result" and "secret"
    const values = { proxySecret: 'qx7secretvalue', resultPath: 'qx7resultvalue' }
    const page = renderStatusPage(values)

    test.expect(configured(page)).toBe(true)
    for (const value of Object.values(values)) {
      test.expect(page).not.toContain(value)
    }
    test.expect(page).not.toContain('{{')
  })
})
