export class AppUtils {
  static toCamelCase(str: string): string {
    if (!str) return '';
    const words = str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/[\s_]+/)
      .filter(Boolean);

    return words
      .map((word, index) => {
        word = word.toLowerCase();
        return index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');
  }

  static toPascalCase(str: string): string {
    const words = str.split(/[\s_]+/).filter(Boolean);
    return words
      .map((word) => {
        word = word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');
  }

  static toSnakeCase(str: string): string {
    const words = str.split(/[\s_]+/).filter(Boolean);
    return words.map((word) => word.toLowerCase()).join('_');
  }

  static isNullOrEmpty(value: unknown): boolean {
    if (value == null) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  }

  static truncate(
    text: string | null | undefined,
    maxLength = 50,
    ellipsis = '...',
    preserveWords = false
  ): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;

    if (maxLength < ellipsis.length + 2) {
      return text.slice(0, Math.max(0, maxLength - ellipsis.length)) + ellipsis;
    }

    const visibleChars = maxLength - ellipsis.length;
    const startChars = Math.ceil(visibleChars / 2);
    const endChars = Math.floor(visibleChars / 2);

    let start = text.slice(0, startChars);
    let end = text.slice(text.length - endChars);

    if (preserveWords) {
      const lastSpaceInStart = start.lastIndexOf(' ');
      if (lastSpaceInStart > visibleChars * 0.3) {
        start = start.slice(0, lastSpaceInStart);
      }
      const firstSpaceInEnd = end.indexOf(' ');
      if (firstSpaceInEnd !== -1 && firstSpaceInEnd < endChars * 0.7) {
        end = end.slice(firstSpaceInEnd + 1);
      }
    }

    return `${start}${ellipsis}${end}`;
  }
}
