export async function check(page, side) {
  const target = page.locator(`#${side} .target`)
  const controller = await target.evaluate(el => el.__aa_ctl != null)
  return {
    controller,
    items: await target.locator('li').count(),
  }
}

export const expected = 'breaks'
