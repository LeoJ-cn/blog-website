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
