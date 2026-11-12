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

// Vue 3.6.0-rc.15 fixes as-child in a Vapor component. With Vue 3.6.0-rc.14 the result is 'breaks'.
export const expected = 'works'
