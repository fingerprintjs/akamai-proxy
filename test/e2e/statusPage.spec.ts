import { test } from '@playwright/test'
import { env } from './utils/env.ts'
import packageJSON from '../../package.json' with { type: 'json' }

const statusEndpoint = `${env.testDomain}/${env.integrationPath}/status`

test.use({
  ignoreHTTPSErrors: env.ignoreHTTPSErrors,
})

test.describe('Status Page', () => {
  test('is deployed', async ({ page }) => {
    await page.goto(statusEndpoint, {
      waitUntil: 'networkidle',
    })

    const statusText = await page.waitForSelector('body > span')
    test.expect(await statusText.innerText()).toBe('Your Akamai Integration is deployed')
  })

  test('shows the integration version', async ({ page }) => {
    await page.goto(statusEndpoint, {
      waitUntil: 'networkidle',
    })

    const versionText = page.locator('body > span').nth(1)
    test.expect(await versionText.innerText()).toBe(`Integration version: ${packageJSON.version}`)
  })

  test('reports a complete setup as configured', async ({ page }) => {
    await page.goto(statusEndpoint, {
      waitUntil: 'networkidle',
    })

    await test.expect(page.getByText('Status:')).toHaveText('Status: Configured ✅')
    await test.expect(page.getByText('APIv4:')).toHaveText('APIv4: Configured ✅')
    await test.expect(page.getByText('APIv3:')).toHaveText('APIv3: Configured ✅')
  })

  test('lists every checked value as present without exposing values', async ({ page }) => {
    await page.goto(statusEndpoint, {
      waitUntil: 'networkidle',
    })

    for (const name of ['proxy_secret', 'integration_path', 'agent_path', 'result_path']) {
      await test.expect(page.getByRole('listitem').filter({ hasText: `${name} (` })).toContainText('is present ✅')
    }

    const content = await page.content()
    test.expect(content).not.toContain('{{')
    test.expect(content).not.toMatch(/@w?[YN]@/)
  })
})
