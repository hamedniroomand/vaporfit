export async function check(page, side) {
  const trigger = page.locator('#' + side + ' .trigger')
  const before = await page.locator('[role=dialog]').count()
  const ariaHaspopup = await trigger.getAttribute('aria-haspopup')
  await trigger.click()
  await page.waitForTimeout(300)
  const opened = (await page.locator('[role=dialog]').count()) - before
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  return { ariaHaspopup, opened }
}

export const expected = 'works'
