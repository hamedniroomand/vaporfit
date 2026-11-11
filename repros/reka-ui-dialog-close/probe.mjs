export async function check(page, side) {
  const before = await page.locator('[role=dialog]').count()
  await page.locator('#' + side + ' .open').click()
  await page.waitForTimeout(300)
  const opened = (await page.locator('[role=dialog]').count()) - before
  const close = page.locator('[role=dialog] .trigger')
  const closeCount = await close.count()
  if (closeCount) await close.first().click()
  await page.waitForTimeout(300)
  const stillOpen = (await page.locator('[role=dialog]').count()) - before
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  return { opened, closeCount, stillOpen }
}

export const expected = 'breaks'
