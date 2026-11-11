export async function check(page, side) {
  const trigger = page.locator('#' + side + ' .trigger')
  const before = await trigger.getAttribute('aria-expanded')
  await trigger.click()
  await page.waitForTimeout(300)
  const after = await trigger.getAttribute('aria-expanded')
  const openPanel = await page.locator('#' + side + ' .panel[data-state=open]').count()
  return { before, after, openPanel }
}

export const expected = 'breaks'
