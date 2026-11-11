export async function check(page, side) {
  const target = page.locator(`#${side} .target`)
  const info = await target.evaluate(el => ({
    opacity: getComputedStyle(el).opacity,
    motion: el.motionInstance != null,
  }))
  return info
}

export const expected = 'breaks'
