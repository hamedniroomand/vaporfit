export async function check(page, side) {
  const trigger = page.locator('#' + side + ' .trigger')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  const before = await page.locator('.panel[data-state=open]').count()
  const aria = await trigger.getAttribute('aria-expanded')
  await trigger.click()
  await page.waitForTimeout(300)
  const opened = (await page.locator('.panel[data-state=open]').count()) - before
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  return { aria, opened }
}

// Vue 3.6.0-rc.15 fixes as-child in a Vapor component. With Vue 3.6.0-rc.14 the result is 'breaks'.
export const expected = 'works'
