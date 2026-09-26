import { expect, test } from '@playwright/test'

test('首页可以正常打开', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Engineering Showcase')
  await expect(page.getByText('Engineering Showcase').first()).toBeVisible()
})

test('可以进入技术 Playground', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '进入技术 Playground' }).click()
  await expect(page).toHaveURL(/#\/playground$/)
  await expect(page.getByRole('heading', { name: '技术 Playground' })).toBeVisible()
})
