/**
 * 型定義付きCSVパーサー
 *
 * CSVフォーマット:
 * 1行目: ヘッダー（カラム名）
 * 2行目: 型定義（string, number, boolean）
 * 3行目以降: データ
 */

export type CSVType = 'string' | 'number' | 'boolean';

/**
 * CSVの1行をパースして配列に変換（RFC 4180準拠）
 * ダブルクォートで囲まれたフィールド内のカンマを正しく処理
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let fieldStart = true; // フィールドの開始位置かどうか
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // 次の文字も"なら、エスケープされた"
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          // クォート終了
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"' && fieldStart) {
        // フィールド先頭でのクォート開始のみ認識
        inQuotes = true;
        fieldStart = false;
        i++;
      } else if (char === ',') {
        // フィールド区切り
        result.push(current.trim());
        current = '';
        fieldStart = true; // 次のフィールドの開始
        i++;
      } else {
        current += char;
        fieldStart = false;
        i++;
      }
    }
  }

  // 最後のフィールドを追加
  result.push(current.trim());

  return result;
}

export function parseTypedCSV<T>(text: string): T[] {
  const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length < 2) {
    console.warn('CSV has no data rows');
    return [];
  }

  const headers = parseCSVLine(lines[0]);
  const types = parseCSVLine(lines[1]).map(t => t as CSVType);
  const dataLines = lines.slice(2);

  return dataLines.map((line, lineIndex) => {
    const values = parseCSVLine(line);
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
