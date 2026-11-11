export async function check(page, side) {
  const target = page.locator('#' + side + ' .target')
  const count = await target.count()
  return {
    count,
    text: count ? await target.textContent() : null,
  }
}

export const expected = 'breaks'
