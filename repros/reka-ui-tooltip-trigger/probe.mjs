export async function check(page, side) {
  const trigger = page.locator('#' + side + ' .trigger')
  await page.mouse.move(0, 0)
  await page.waitForTimeout(200)
  const before = await page.locator('[role=tooltip]').count()
  await trigger.hover()
  await page.waitForTimeout(400)
  const opened = (await page.locator('[role=tooltip]').count()) - before
  const describedBy = (await trigger.getAttribute('aria-describedby')) !== null
  await page.mouse.move(0, 0)
  await page.waitForTimeout(200)
  return { describedBy, opened }
}

export const expected = 'breaks'
