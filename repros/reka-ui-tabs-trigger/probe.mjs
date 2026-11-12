export async function check(page, side) {
  const tab = page.locator(`#${side} button.tab-b`)
  const role = await tab.getAttribute('role')
  await tab.click()
  await page.waitForTimeout(200)
  const state = await tab.getAttribute('data-state')
  const panels = await page.locator(`#${side} .panel-b`).count()
  return { role, stateAfterClick: state, panelsAfterClick: panels }
}

// Vue 3.6.0-rc.15 fixes as-child in a Vapor component. With Vue 3.6.0-rc.14 the result is 'breaks'.
// TabsTrigger is not one of the components in the reka-ui/as-child rule. It checks reka-ui/as-child-other.
export const expected = 'works'
