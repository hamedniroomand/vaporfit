export async function check(page, side) {
  const trigger = page.locator('#' + side + ' .trigger')
  await page.mouse.move(0, 0)
  await page.waitForTimeout(200)
  const before = await page.locator('.panel[data-state=open]').count()
  const state = await trigger.getAttribute('data-state')
  await trigger.hover()
  await page.waitForTimeout(400)
  const opened = (await page.locator('.panel[data-state=open]').count()) - before
  await page.mouse.move(0, 0)
  await page.waitForTimeout(200)
  return { state, opened }
}

export const expected = 'breaks'
