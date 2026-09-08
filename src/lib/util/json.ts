/** モデルの返答から JSON 配列だけを取り出す。取り出せなければ null（無理に解釈しない）。 */
export function parseJsonArray(text: string): string[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!Array.isArray(v)) return null;
    const out = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    return out.length ? out : null;
  } catch {
    return null;
  }
}
