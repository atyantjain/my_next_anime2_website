/**
 * Extract dominant colors from an image URL using canvas.
 * Filters out very dark/light colors, returns hex strings.
 */
export function extractDominantColors(
  imageUrl: string,
  numColors = 3
): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 100;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(["#667eea", "#764ba2", "#f093fb"]);

      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      // Reduce color space and count frequencies
      const counts = new Map<string, { r: number; g: number; b: number; count: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;
        const entry = counts.get(key);
        if (entry) {
          entry.count++;
        } else {
          counts.set(key, { r, g, b, count: 1 });
        }
      }

      // Sort by frequency, filter out too dark / too light
      const sorted = [...counts.values()]
        .sort((a, b) => b.count - a.count)
        .filter(({ r, g, b }) => {
          const brightness = r * 0.299 + g * 0.587 + b * 0.114;
          return brightness > 60 && brightness < 220;
        });

      const colors: string[] = [];
      for (const { r, g, b } of sorted) {
        const enhanced = [r, g, b].map((c) => Math.min(255, Math.round(c * 1.15)));
        colors.push(
          `#${enhanced.map((c) => c.toString(16).padStart(2, "0")).join("")}`
        );
        if (colors.length >= numColors) break;
      }

      // Fallback defaults
      while (colors.length < numColors) {
        colors.push(["#667eea", "#764ba2", "#f093fb"][colors.length]);
      }

      resolve(colors);
    };
    img.onerror = () => resolve(["#667eea", "#764ba2", "#f093fb"]);
    img.src = imageUrl;
  });
}
