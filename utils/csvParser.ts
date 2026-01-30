/**
 * 型定義付きCSVパーサー
 *
 * CSVフォーマット:
 * 1行目: ヘッダー（カラム名）
 * 2行目: 型定義（string, number, boolean）
 * 3行目以降: データ
 */

export type CSVType = 'string' | 'number' | 'boolean';

export function parseTypedCSV<T>(text: string): T[] {
  const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length < 2) {
    console.warn('CSV has no data rows');
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const types = lines[1].split(',').map(t => t.trim() as CSVType);
  const dataLines = lines.slice(2);

  return dataLines.map((line, lineIndex) => {
    const values = line.split(',').map(v => v.trim());
    const obj: Record<string, unknown> = {};

    headers.forEach((key, i) => {
      const value = values[i] ?? '';
      const type = types[i] ?? 'string';

      switch (type) {
        case 'number':
          const num = parseFloat(value);
          obj[key] = isNaN(num) ? 0 : Math.round(num); // 整数に四捨五入
          break;
        case 'boolean':
          obj[key] = value.toLowerCase() === 'true' || value === '1';
          break;
        default:
          obj[key] = value;
      }
    });

    return obj as T;
  });
}

/**
 * CSVファイルをfetchして型付きでパース
 */
export async function loadCSV<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${path}`);
    }
    const text = await response.text();
    return parseTypedCSV<T>(text);
  } catch (error) {
    console.error(`Error loading CSV from ${path}:`, error);
    return [];
  }
}
