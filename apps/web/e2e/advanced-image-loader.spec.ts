import { expect, test } from '@playwright/test'

test('高性能图片方案可以切换基础和压力数据集', async ({ page }) => {
  await page.goto('/#/playground/browser')

  await expect(page.locator('[data-page="advanced-image-loader"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Advanced Image Loader' })).toBeVisible()
  await expect(page.getByText('4 张图片')).toBeVisible()

  await page.getByRole('button', { name: '并发压力' }).click()

  await expect(page.getByText('100 张图片')).toBeVisible()
})

test('原图模式会重新挂载图片组件', async ({ page }) => {
  await page.goto('/#/playground/browser')

  const gallery = page.getByTestId('advanced-image-gallery')
  const initialVersion = await gallery.getAttribute('data-render-version')

  await page.getByRole('checkbox', { name: '使用原图尺寸' }).check()

  await expect(gallery).not.toHaveAttribute('data-render-version', initialVersion ?? '')
})

test('Browser 内部切换保留动画，进入 Performance 时清除动画', async ({ page }) => {
  await page.goto('/#/playground/browser')

  await expect(page.getByTestId('animation-controls')).toBeVisible()
  await page.getByRole('button', { name: '增加动画' }).click()
  await expect(page.getByTestId('managed-moving-box')).toHaveCount(1)

  await page.getByRole('button', { name: '原生Image模式' }).click()
  await expect(page.getByTestId('managed-moving-box')).toHaveCount(1)

  await page.getByRole('button', { name: '取消所有动画' }).click()
  await expect(page.getByTestId('managed-moving-box')).toHaveCount(0)

  await page.getByRole('button', { name: '增加动画' }).click()
  await expect(page.getByTestId('managed-moving-box')).toHaveCount(1)

  await page.getByRole('link', { name: /Performance/ }).click()
  await expect(page).toHaveURL(/#\/playground\/performance$/)
  await expect(page.getByTestId('managed-moving-box')).toHaveCount(0)
})
