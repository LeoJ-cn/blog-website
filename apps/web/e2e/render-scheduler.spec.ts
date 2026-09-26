import { expect, test } from '@playwright/test'

test('协作式任务编排器紧跟图片模块并按优先级渲染模块', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto('/#/playground/browser')

  const browserProjects = page.locator('.playground-nav__group').filter({
    has: page.getByRole('link', { name: /Browser/ }),
  })

  await expect(browserProjects.locator('.playground-nav__project')).toHaveText([
    'Advanced Image Loader',
    '协作式任务编排器',
    '设备性能探针',
  ])

  await browserProjects.getByRole('link', { name: '协作式任务编排器' }).click()

  await expect(page).toHaveURL(/#\/playground\/browser\/render-scheduler$/)
  await expect(page.locator('[data-page="render-scheduler"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '协作式任务编排器', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '📊 协作式任务编排器' })).toBeVisible()

  const moduleA = page.getByTestId('scheduled-module-a')
  const moduleB = page.getByTestId('scheduled-module-b')

  await expect(moduleA).toBeVisible()
  await expect(moduleB).toBeVisible()
  await expect(moduleA.getByText('列表 (共 300 条)', { exact: false })).toBeVisible()
  await expect(moduleB.getByText('列表 (共 300 条)', { exact: false })).toBeVisible()
  await expect(moduleA.getByText('✅ 加载完成')).toBeVisible({ timeout: 30_000 })
  await expect(moduleB.getByText('✅ 加载完成')).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: '隐藏主组件' }).click()
  await expect(page.getByRole('heading', { name: '📊 协作式任务编排器' })).toBeHidden()
  await expect(moduleA).toBeHidden()
  await expect(moduleB).toBeHidden()

  await page.getByRole('button', { name: '显示主组件' }).click()
  await expect(page.getByRole('heading', { name: '📊 协作式任务编排器' })).toBeVisible()
  await expect(moduleA).toBeVisible()
  await expect(moduleB).toBeHidden()
  await expect(moduleA.getByText('✅ 加载完成')).toBeVisible({ timeout: 30_000 })
  await expect(moduleB.getByText('✅ 加载完成')).toBeVisible({ timeout: 30_000 })
  expect(consoleErrors).toEqual([])
})
