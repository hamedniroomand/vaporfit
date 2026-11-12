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

// Vue 3.6.0-rc.15 fixes as-child through a VDOM wrapper. With Vue 3.6.0-rc.14 the result is 'breaks'.
export const expected = 'works'
