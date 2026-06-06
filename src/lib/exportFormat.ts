export type ExportFormat = '16:9' | '9:16' | '1:1';

export const FORMAT_RATIOS: Record<ExportFormat, { num: number; den: number }> = {
  '16:9': { num: 16, den: 9 },
  '9:16': { num: 9, den: 16 },
  '1:1': { num: 1, den: 1 },
};

type Resolution = '480p' | '720p' | '1080p';

const RESOLUTION_SHORT_SIDE: Record<Resolution, number> = {
  '480p': 480,
  '720p': 720,
  '1080p': 1080,
};

/** Dimensions cibles pour la composition vidéo selon format et résolution. */
export function getExportDimensions(
  resolution: Resolution = '720p',
  format: ExportFormat = '16:9',
): { width: number; height: number } {
  const shortSide = RESOLUTION_SHORT_SIDE[resolution];

  if (format === '16:9') {
    return { width: Math.round(shortSide * 16 / 9), height: shortSide };
  }
  if (format === '9:16') {
    return { width: shortSide, height: Math.round(shortSide * 16 / 9) };
  }
  return { width: shortSide, height: shortSide };
}

export function isPortraitFormat(format: ExportFormat): boolean {
  return format === '9:16';
}

export function isSquareFormat(format: ExportFormat): boolean {
  return format === '1:1';
}

export function buildCropFilter(format: ExportFormat): string {
  const { num, den } = FORMAT_RATIOS[format];
  const ratio = num / den;
  return `crop='if(gte(a,${ratio}),floor(ih*${ratio}/2)*2,iw)':'if(gte(a,${ratio}),ih,floor(iw/${ratio}/2)*2)':(iw-ow)/2:(ih-oh)/2`;
}
