import { RacingStyle, OverlayStats } from '../types';
import type { LogoBrand } from './logoCatalog';
import { loadBrandLogoImage } from './logoCatalog';

const assetUrl = (pathFromPublic: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  const rel = pathFromPublic.replace(/^\//, '');
  return `${base}${rel}`;
};

const GT_WORLD_LOGOS: Record<string, string> = {
  ACURA: 'logos/acura.png',
  'ASTON MARTIN': 'logos/aston_martin.png',
  AMR: 'logos/aston_martin.png',
  AUDI: 'logos/audi.png',
  'AUDI SPORT': 'logos/audi.png',
  BMW: 'logos/bmw.png',
  CHEVROLET: 'logos/chevrolet.png',
  CORVETTE: 'logos/chevrolet.png',
  FERRARI: 'logos/ferrari.png',
  'SCUDERIA FERRARI': 'logos/ferrari.png',
  FORD: 'logos/ford.png',
  MUSTANG: 'logos/ford.png',
  LAMBORGHINI: 'logos/lamborghini.png',
  MCLAREN: 'logos/mclaren.png',
  MERCEDES: 'logos/mercedes.png',
  'MERCEDES-AMG': 'logos/mercedes.png',
  AMG: 'logos/mercedes.png',
  NISSAN: 'logos/nissan.png',
  NISMO: 'logos/nissan.png',
  PORSCHE: 'logos/porsche.png',
  TOYOTA: 'logos/toyota.png',
  LEXUS: 'logos/lexus.png',
  HONDA: 'logos/honda.png',
  SALEEN: 'logos/saleen.png',
  CALLAWAY: 'logos/callaway.png',
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

const getLogoPathVariants = (basePath: string): string[] => {
  const match = basePath.match(/^(.*\/)?([^/]+)\.(png|svg|webp)$/i);
  if (!match) return [basePath];
  const prefix = match[1] ?? '';
  const name = match[2];
  const ext = match[3];
  const lower = name.toLowerCase();
  const variants: string[] = [basePath];
  const titleCase = lower.charAt(0).toUpperCase() + lower.slice(1);
  if (titleCase !== lower) variants.push(`${prefix}${titleCase}.${ext}`);
  if (lower.includes('_')) {
    const segmentTitle = lower
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('_');
    if (segmentTitle !== titleCase) variants.push(`${prefix}${segmentTitle}.${ext}`);
  }
  if (name.length >= 2 && name.length <= 4) variants.push(`${prefix}${lower.toUpperCase()}.${ext}`);
  return [...new Set(variants)];
};

const loadLogoWithVariants = async (basePath: string): Promise<HTMLImageElement | null> => {
  const paths = getLogoPathVariants(basePath);
  for (const src of paths) {
    try {
      const img = await loadImage(src);
      if (img.naturalWidth > 0) return img;
    } catch {
      continue;
    }
  }
  return null;
};

const drawImageContain = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  if (!img.src || img.width === 0) return;

  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let drawW, drawH, drawX, drawY;

  if (imgRatio > targetRatio) {
    drawW = w;
    drawH = w / imgRatio;
    drawX = x;
    drawY = y + (h - drawH) / 2;
  } else {
    drawH = h;
    drawW = h * imgRatio;
    drawY = y;
    drawX = x + (w - drawW) / 2;
  }

  const padding = 12;
  ctx.drawImage(img, drawX + padding, drawY + padding, drawW - padding * 2, drawH - padding * 2);
};

const renderCanvasOverlay = async (
  stats: OverlayStats,
  driverName: string,
  style: RacingStyle,
  logoCatalog: LogoBrand[]
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const outputWidth = 1000;
  const safeMargin = 20;
  const drawnWidth = outputWidth - safeMargin * 2;

  const bannerHeight = 100;
  const bannerY = centerY - bannerHeight / 2;
  const startX = centerX - drawnWidth / 2;

  const fontBold = "bold 50px 'Inter', sans-serif";
  const fontSmall = "bold 24px 'Inter', sans-serif";

  let accentColor = '#ff0000';
  let skew = 0;

  switch (style) {
    case RacingStyle.GTWC_BROADCAST:
      skew = -0.2;
      break;
    case RacingStyle.NEON_STREET:
      accentColor = '#00ffff';
      skew = 0;
      break;
    case RacingStyle.RETRO_WAVE:
      accentColor = '#ff00ff';
      skew = -0.1;
      break;
    case RacingStyle.RALLY_DIRT:
      accentColor = '#ff6f00';
      skew = 0;
      break;
    case RacingStyle.FORMULA_TECH:
      accentColor = '#00ffcc';
      skew = 0;
      break;
    default:
      break;
  }

  ctx.setTransform(1, 0, skew, 1, skew * -centerY, 0);

  const numBoxWidth = 110;
  ctx.fillStyle = style === RacingStyle.GTWC_BROADCAST ? '#cc0000' : accentColor;
  ctx.fillRect(startX, bannerY, numBoxWidth, bannerHeight);

  ctx.fillStyle = '#ffffff';
  ctx.font = fontBold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stats.carNumber, startX + numBoxWidth / 2, bannerY + bannerHeight / 2 + 2);

  const brandBoxWidth = 150;
  const brandX = startX + numBoxWidth;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(brandX, bannerY, brandBoxWidth, bannerHeight);

  ctx.save();
  let logoDrawn = false;

  const cleanBrand = stats.carBrand.trim().toUpperCase();
  const catalogLogo = await loadBrandLogoImage(cleanBrand, logoCatalog);
  if (catalogLogo) {
    drawImageContain(ctx, catalogLogo, brandX, bannerY, brandBoxWidth, bannerHeight);
    logoDrawn = true;
  }

  if (!logoDrawn) {
    let specificFile = GT_WORLD_LOGOS[cleanBrand];
    if (!specificFile) {
      const foundKey = Object.keys(GT_WORLD_LOGOS).find((k) => cleanBrand.includes(k));
      if (foundKey) specificFile = GT_WORLD_LOGOS[foundKey];
    }
    if (!specificFile) {
      const filename = cleanBrand.toLowerCase().replace(/[^a-z0-9]/g, '_');
      specificFile = `logos/${filename}.png`;
    }
    const logoImg = await loadLogoWithVariants(assetUrl(specificFile));
    if (logoImg) {
      drawImageContain(ctx, logoImg, brandX, bannerY, brandBoxWidth, bannerHeight);
      logoDrawn = true;
    }
  }

  if (!logoDrawn && stats.brandDomain) {
    const domain = stats.brandDomain
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .toLowerCase()
      .trim();

    if (domain.length > 2) {
      try {
        const logoUrl = `https://logo.clearbit.com/${domain}?size=200`;
        const logoImg = await loadImage(logoUrl);
        drawImageContain(ctx, logoImg, brandX, bannerY, brandBoxWidth, bannerHeight);
        logoDrawn = true;
      } catch {
        try {
          const fallbackUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
          const fallbackImg = await loadImage(fallbackUrl);
          drawImageContain(ctx, fallbackImg, brandX, bannerY, brandBoxWidth, bannerHeight);
          logoDrawn = true;
        } catch (e2) {
          console.warn('All logo fetch attempts failed', e2);
        }
      }
    }
  }

  if (!logoDrawn) {
    ctx.fillStyle = '#000000';
    ctx.font = "bold italic 22px 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      stats.carBrand.toUpperCase().substring(0, 10),
      brandX + brandBoxWidth / 2,
      bannerY + bannerHeight / 2
    );
  }
  ctx.restore();

  const classBoxWidth = 130;
  const nameBarWidth = drawnWidth - numBoxWidth - brandBoxWidth - classBoxWidth;
  const nameBarX = brandX + brandBoxWidth;

  const grad = ctx.createLinearGradient(nameBarX, bannerY, nameBarX + nameBarWidth, bannerY);
  grad.addColorStop(0, '#1a1a1a');
  grad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(nameBarX, bannerY, nameBarWidth, bannerHeight);

  let textOffsetX = 30;

  if (stats.countryCode && stats.countryCode.length === 2) {
    try {
      const flagUrl = `https://flagcdn.com/h60/${stats.countryCode.toLowerCase()}.png`;
      const flagImg = await loadImage(flagUrl);

      const flagW = 60;
      const flagH = 40;
      const flagX = nameBarX + 20;
      const flagY = bannerY + (bannerHeight - flagH) / 2;

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(flagX, flagY, flagW, flagH);
      ctx.drawImage(flagImg, flagX, flagY, flagW, flagH);
      ctx.restore();

      textOffsetX = 20 + flagW + 20;
    } catch {
      console.warn('Could not load flag for code', stats.countryCode);
    }
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 40px 'Inter', sans-serif";
  ctx.textAlign = 'left';
  const nameUpper = driverName ? driverName.toUpperCase() : 'DRIVER NAME';
  const hasTeam = stats.teamName && stats.teamName.trim().length > 0;
  if (hasTeam) {
    ctx.font = "bold 36px 'Inter', sans-serif";
    ctx.fillText(nameUpper, nameBarX + textOffsetX, bannerY + bannerHeight / 2 - 12);
    ctx.font = "bold 20px 'Inter', sans-serif";
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(
      stats.teamName!.trim().toUpperCase(),
      nameBarX + textOffsetX,
      bannerY + bannerHeight / 2 + 18
    );
    ctx.fillStyle = '#ffffff';
  } else {
    ctx.fillText(nameUpper, nameBarX + textOffsetX, bannerY + bannerHeight / 2 + 2);
  }

  const classX = nameBarX + nameBarWidth;
  let classColor = '#333333';
  const cls = stats.classCategory;

  if (cls.includes('GOLD')) classColor = '#FFD700';
  else if (cls.includes('SILVER')) classColor = '#C0C0C0';
  else if (cls.includes('BRONZE')) classColor = '#CD7F32';
  else if (cls.includes('PRO-AM')) classColor = '#000000';
  else if (cls === 'PRO') classColor = '#ffffff';

  ctx.fillStyle = classColor;
  ctx.fillRect(classX, bannerY, classBoxWidth, bannerHeight);

  const isBright = ['GOLD', 'SILVER', 'PRO', 'WHITE'].some((c) => cls.includes(c));
  ctx.fillStyle = isBright ? '#000000' : '#ffffff';

  ctx.font = fontSmall;
  ctx.textAlign = 'center';
  ctx.fillText(cls, classX + classBoxWidth / 2, bannerY + bannerHeight / 2 + 1);

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  return canvas.toDataURL('image/png');
};

export const generateRacingOverlayFromStats = async (
  stats: OverlayStats,
  driverName: string,
  style: RacingStyle,
  logoCatalog: LogoBrand[] = []
): Promise<string> => {
  const name = (driverName || '').trim() || 'DRIVER NAME';
  return await renderCanvasOverlay(stats, name, style, logoCatalog);
};
