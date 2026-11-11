export async function check(page, side) {
  const button = page.locator(`#${side} button.trigger`)
  const before = await button.getAttribute('aria-haspopup')
  await button.click()
  await page.waitForTimeout(300)
  const open = await page.locator('[role=dialog]').count()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  return { ariaHaspopup: before, dialogsAfterClick: open }
}

export const expected = 'breaks'
