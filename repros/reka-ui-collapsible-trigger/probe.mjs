export async function check(page, side) {
  const trigger = page.locator('#' + side + ' .trigger')
  const before = await trigger.getAttribute('aria-expanded')
  await trigger.click()
  await page.waitForTimeout(300)
  const after = await trigger.getAttribute('aria-expanded')
  const openPanel = await page.locator('#' + side + ' .panel[data-state=open]').count()
  return { before, after, openPanel }
}

// Vue 3.6.0-rc.15 fixes as-child in a Vapor component. With Vue 3.6.0-rc.14 the result is 'breaks'.
export const expected = 'works'
