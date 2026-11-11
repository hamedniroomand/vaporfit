export async function check(page, side) {
  const trigger = page.locator('#' + side + ' .trigger')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  const before = await page.locator('[role=menu]').count()
  const state = await trigger.getAttribute('data-state')
  await trigger.click({ button: 'right' })
  await page.waitForTimeout(300)
  const opened = (await page.locator('[role=menu]').count()) - before
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  return { state, opened }
}

export const expected = 'breaks'
