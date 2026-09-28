export interface WordCountStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingTimeMinutes: number;
  readingTimeFormatted: string;
  speakingTimeFormatted: string;
  sizeBytes: number;
  sizeFormatted: string;
}

export type CaseMode =
  | 'uppercase'
  | 'lowercase'
  | 'titlecase'
  | 'sentencecase'
  | 'camelcase'
  | 'pascalcase'
  | 'snakecase'
  | 'kebabcase';

export interface TextCleanerOptions {
  trimOverall: boolean;
  trimEachLine: boolean;
  removeExtraSpaces: boolean;
  removeEmptyLines: boolean;
  normalizeBlankLines: boolean;
  removeLineBreaks?: boolean;
  stripHtml?: boolean;
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format reading/speaking time in human-friendly format
 * e.g., "< 1 min", "1 min 30 sec", "5 min"
 */
function formatTimeFromMinutes(minutesFloat: number): string {
  if (minutesFloat <= 0) return '0 min';
  const totalSeconds = Math.round(minutesFloat * 60);
  if (totalSeconds < 60) return '< 1 min';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}

/**
 * Comprehensive Word & Character statistics counter.
 * 
 * Rules:
 * - Words: Non-whitespace sequences, Unicode letter sequences. Handles hyphenated words, contraction apostrophes ("don't", "state-of-the-art").
 * - Characters (with spaces): Total string length (Unicode code-points).
 * - Characters (no spaces): Total characters excluding \s.
 * - Sentences: Identified by terminal punctuation (. ! ?) followed by whitespace, quotes, or line ends.
 *   Avoids splitting on common abbreviations like "e.g.", "Dr.", "U.S.A.", or decimal numbers "3.14".
 *   Defaults to 1 sentence if non-empty text has words but no trailing punctuation.
 * - Paragraphs: Blocks separated by one or more blank lines.
 * - Reading Time: Based on standard 200 words per minute (WPM).
 * - Speaking Time: Based on standard 130 words per minute (WPM).
 */
export function countTextStats(text: string): WordCountStats {
  const codePoints = Array.from(text);
  const characters = codePoints.length;
  const charactersNoSpaces = codePoints.filter((ch) => !/\s/.test(ch)).length;
  const sizeBytes = new TextEncoder().encode(text).length;
  const sizeFormatted = formatByteSize(sizeBytes);
  const lines = text.length === 0 ? 0 : text.split('\n').length;

  if (characters === 0 || text.trim().length === 0) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
      readingTimeMinutes: 0,
      readingTimeFormatted: '0 min',
      speakingTimeFormatted: '0 min',
      sizeBytes: 0,
      sizeFormatted: '0 B',
    };
  }

  // Count Words: Matches words with letters, numbers, contractions ('s, n't), and hyphens
  // Unicode-aware word matching
  const wordsMatch = text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu);
  const words = wordsMatch ? wordsMatch.length : 0;

  // Count Paragraphs: Non-empty chunks separated by double newlines or blank lines
  const paragraphsList = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const paragraphs = paragraphsList.length;

  // Count Sentences:
  // Clean text from common abbreviations and acronyms to avoid false positive splits
  const cleanedForSentences = text
    .replace(/(?:[a-zA-Z]\.){2,}/g, '_acronym_')
    .replace(/\b(?:etc|vs|dr|mr|mrs|ms|prof|sr|jr|st|ave|rd)\./gi, '_abbr_')
    .replace(/(\d+)\.(\d+)/g, '$1_dec_$2'); // preserve decimal points like 3.14

  // Match sentences ending in ., !, ?, or ellipses ...
  const sentenceMatches = cleanedForSentences.match(/[^.!?\n]+(?:[.!?]+["'”’]?|$)/gu);
  let sentences = 0;
  if (sentenceMatches) {
    sentences = sentenceMatches.filter((s) => s.trim().length > 0 && /[\p{L}\p{N}]/u.test(s)).length;
  }
  if (sentences === 0 && words > 0) {
    sentences = 1;
  }

  // Reading time (200 WPM)
  const readingTimeMinutes = words / 200;
  const readingTimeFormatted = formatTimeFromMinutes(readingTimeMinutes);

  // Speaking time (130 WPM)
  const speakingTimeMinutes = words / 130;
  const speakingTimeFormatted = formatTimeFromMinutes(speakingTimeMinutes);

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    lines,
    readingTimeMinutes,
    readingTimeFormatted,
    speakingTimeFormatted,
    sizeBytes,
    sizeFormatted,
  };
}

/**
 * Case Conversion Algorithms
 */

// Helper to extract words from string for camelCase, PascalCase, snake_case, kebab-case
function extractWordsForCasing(text: string): string[] {
  // Splits on camelCase/PascalCase boundaries, underscores, dashes, spaces, and punctuation
  return text
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1 $2')
    .split(/[\s_\-+./\\,;:!?()[\]{}|<>="`~*&^%$#@]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

export function toUppercase(text: string): string {
  return text.toUpperCase();
}

export function toLowercase(text: string): string {
  return text.toLowerCase();
}

const TITLE_CASE_SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'en',
  'for',
  'if',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'per',
  'the',
  'to',
  'v',
  'vs',
  'via',
  'with',
]);

export function toTitleCase(text: string): string {
  if (!text) return '';

  // Process line by line to preserve line breaks
  return text
    .split('\n')
    .map((line) => {
      const tokens = line.split(/(\s+)/);
      let wordIndex = 0;
      const nonWhitespaceCount = tokens.filter((t) => /\S/.test(t)).length;

      return tokens
        .map((token) => {
          if (!/\S/.test(token)) return token; // preserve whitespace

          const lower = token.toLowerCase();
          const isFirstOrLast = wordIndex === 0 || wordIndex === nonWhitespaceCount - 1;
          wordIndex++;

          // If hyphenated word like "state-of-the-art"
          if (token.includes('-')) {
            const subWords = token.split('-');
            return subWords
              .map((sub, i) => {
                const subLower = sub.toLowerCase();
                if (i > 0 && TITLE_CASE_SMALL_WORDS.has(subLower)) {
                  return subLower;
                }
                return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
              })
              .join('-');
          }

          if (!isFirstOrLast && TITLE_CASE_SMALL_WORDS.has(lower)) {
            return lower;
          }

          return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
        })
        .join('');
    })
    .join('\n');
}

export function toSentenceCase(text: string): string {
  if (!text) return '';

  // Lowercase the entire text, then capitalize first letter of each sentence
  const lower = text.toLowerCase();

  // Match start of string or character following . ! ? or newline
  return lower.replace(/(^\s*|[.!?\n]\s+)(\p{L})/gu, (_, prefix, char) => {
    return prefix + char.toUpperCase();
  });
}

export function toCamelCase(text: string): string {
  const words = extractWordsForCasing(text);
  if (words.length === 0) return '';
  return words
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

export function toPascalCase(text: string): string {
  const words = extractWordsForCasing(text);
  if (words.length === 0) return '';
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

export function toSnakeCase(text: string): string {
  const words = extractWordsForCasing(text);
  return words.map((w) => w.toLowerCase()).join('_');
}

export function toKebabCase(text: string): string {
  const words = extractWordsForCasing(text);
  return words.map((w) => w.toLowerCase()).join('-');
}

export function convertCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case 'uppercase':
      return toUppercase(text);
    case 'lowercase':
      return toLowercase(text);
    case 'titlecase':
      return toTitleCase(text);
    case 'sentencecase':
      return toSentenceCase(text);
    case 'camelcase':
      return toCamelCase(text);
    case 'pascalcase':
      return toPascalCase(text);
    case 'snakecase':
      return toSnakeCase(text);
    case 'kebabcase':
      return toKebabCase(text);
    default:
      return text;
  }
}

/**
 * Text Cleaner Transformations
 */
export function cleanText(text: string, options: TextCleanerOptions): string {
  if (!text) return '';

  let result = text;

  // 1. Strip HTML tags (if enabled)
  if (options.stripHtml) {
    result = result.replace(/<\/?[^>]+(>|$)/gi, '');
  }

  // 2. Remove line breaks into single paragraph (if enabled)
  if (options.removeLineBreaks) {
    result = result.replace(/\r?\n+/g, ' ');
  }

  // Split into lines for line-based transformations
  let lines = result.split(/\r?\n/);

  // 3. Trim whitespace from each line
  if (options.trimEachLine) {
    lines = lines.map((line) => line.trim());
  }

  // 4. Remove extra spaces within lines (collapse multiple spaces/tabs into a single space)
  if (options.removeExtraSpaces) {
    lines = lines.map((line) => line.replace(/[^\S\r\n]+/g, ' '));
  }

  // 5. Remove empty lines entirely
  if (options.removeEmptyLines) {
    lines = lines.filter((line) => line.trim().length > 0);
  }

  // 6. Normalize repeated blank lines (collapse multiple consecutive blank lines to one)
  if (options.normalizeBlankLines && !options.removeEmptyLines) {
    const normalized: string[] = [];
    let previousWasEmpty = false;

    for (const line of lines) {
      const isEmpty = line.trim().length === 0;
      if (isEmpty) {
        if (!previousWasEmpty) {
          normalized.push('');
          previousWasEmpty = true;
        }
      } else {
        normalized.push(line);
        previousWasEmpty = false;
      }
    }
    lines = normalized;
  }

  result = lines.join('\n');

  // 7. Trim leading and trailing whitespace from the overall text
  if (options.trimOverall) {
    result = result.trim();
  }

  return result;
}

/**
 * Sample datasets for initial loading
 */

export const WORD_COUNTER_SAMPLE = `ASAPTools is engineered for modern digital workflows. It offers developers, students, and professionals fast, privacy-focused online utilities without clutter or subscriptions.

When writing an essay, documentation, or marketing copy, tracking precise word counts and reading estimates is essential. For instance, an average reader consumes approximately 200 words per minute (WPM), while a conference speaker delivers around 130 WPM.

Does your content communicate clearly? Try testing different paragraphs, dialogue quotations, numbers (like 3.14159), and international currencies (such as $100 or ₹5,000). Every metric recalculates instantly right inside your browser!`;

export const CASE_CONVERTER_SAMPLE = `ASAPTools text toolkit transforms your content seamlessly.
This sample text contains mixed casing, words, and identifiers like user_first_name, apiKeySecret, and total-amount.`;

export const TEXT_CLEANER_SAMPLE = `     ASAPTools Text Cleaner     

This    paragraph    contains     excessive     inline     spaces.   
It also has   trailing spaces at the end of lines.     


There are several empty,     blank lines above and below this sentence.     



Clean your text in one click to remove extra spaces, trim lines, and normalize line breaks!   
`;
