/**
 * Puts text on the clipboard. The Clipboard API only exists in a secure
 * context, so on plain http (a dev server reached over the network) it falls
 * back to selecting a hidden textarea and the old copy command. Resolves
 * false when neither worked, so a button never claims a copy it didn't make.
 */
export async function copyText(text: string) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Denied or unavailable: try the fallback.
  }
  const area = document.createElement("textarea")
  area.value = text
  area.setAttribute("readonly", "")
  area.style.position = "fixed"
  area.style.opacity = "0"
  document.body.append(area)
  area.select()
  try {
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    area.remove()
  }
}
