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
  await expect(moduleA.getByText('列表 (共 1000 条)', { exact: false })).toBeVisible({
    timeout: 30_000,
  })
  await expect(moduleB.getByText('列表 (共 2000 条)', { exact: false })).toBeVisible({
    timeout: 30_000,
  })
  await expect(moduleA.getByText('✅ 加载完成')).toBeVisible({ timeout: 30_000 })
  await expect(moduleB.getByText('✅ 加载完成')).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: '隐藏主组件' }).click()
  await expect(page.getByRole('heading', { name: '📊 协作式任务编排器' })).toBeVisible()
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

test('协作式任务编排器复用完整的 V2 性能面板', async ({ page }) => {
  await page.goto('/#/playground/browser/render-scheduler')

  await expect(page.getByRole('complementary', { name: '动画性能监控' })).toBeVisible()
  await expect(page.getByTestId('performance-fps')).toHaveText(/^\d+$/)
  await expect(page.getByTestId('performance-p95')).toHaveText(/^\d+(\.\d)?ms\s*$/)

  await page.getByRole('button', { name: '增加动画' }).click()
  await expect(page.getByTestId('managed-moving-box')).toHaveCount(1)
  await expect(page.getByRole('switch', { name: '关闭' })).toBeEnabled()

  await page.getByRole('link', { name: 'Advanced Image Loader' }).click()
  await expect(page.getByTestId('managed-moving-box')).toHaveCount(0)
})
