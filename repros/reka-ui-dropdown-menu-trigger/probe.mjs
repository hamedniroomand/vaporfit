export async function check(page, side) {
  const trigger = page.locator('#' + side + ' .trigger')
  await page.mouse.move(0, 0)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  const before = await page.locator('[role=menu]').count()
  const aria = await trigger.getAttribute('aria-haspopup')
  await trigger.click()
  await page.waitForTimeout(300)
  const opened = (await page.locator('[role=menu]').count()) - before
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  return { aria, opened }
}

export const expected = 'breaks'
