const decorativeSymbolPattern = /(?:[#*0-9]\uFE0F?\u20E3)|[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu;

export function stripDecorativeSymbols(value: string): string {
  return value
    .replace(decorativeSymbolPattern, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
