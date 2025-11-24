import { converter, formatCss } from 'culori';

// Create converter functions
const rgbToOklch = converter('oklch');

// State
let processedImages = [];
let activeImageId = null;
let microPalette = [];

// DOM Elements
const sidebarUploadArea = document.getElementById('sidebarUploadArea');
const fileInput = document.getElementById('fileInput');
const colorCountInput = document.getElementById('colorCount');
const clearBtn = document.getElementById('clearBtn');

// Event Listeners
sidebarUploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFiles);
clearBtn.addEventListener('click', clearAllResults);

// Drag and drop for sidebar upload area
sidebarUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  sidebarUploadArea.classList.add('drag-over');
});

sidebarUploadArea.addEventListener('dragleave', () => {
  sidebarUploadArea.classList.remove('drag-over');
});

sidebarUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  sidebarUploadArea.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(file => 
    file.type.startsWith('image/')
  );
  processImages(files);
});

function handleFiles(e) {
  const files = Array.from(e.target.files);
  processImages(files);
  fileInput.value = ''; // Reset input
}

async function processImages(files) {
  const colorCount = parseInt(colorCountInput.value);
  
  for (const file of files) {
    try {
      const primaryPalette = await extractPalette(file, colorCount);
      const microColors = await extractMicroPalette(file, 256);
      
      // Generate 10 alternative palettes based on the primary
      const palettes = {
        primary: { name: 'Extracted Colors', colors: primaryPalette },
        soft: { name: 'Soft Pastels', colors: generateSoftPalette(primaryPalette) },
        inverted: { name: 'Complementary', colors: generateInvertedPalette(primaryPalette) },
        vibrant: { name: 'Vibrant Bold', colors: generateVibrantPalette(primaryPalette) },
        highlighter: { name: 'Highlighter Neon', colors: generateHighlighterPalette(primaryPalette) },
        monochrome: { name: 'Monochrome', colors: generateMonochromePalette(primaryPalette) },
        dark: { name: 'Dark Mode', colors: generateDarkPalette(primaryPalette) },
        neon: { name: 'Neon Electric', colors: generateNeonPalette(primaryPalette) },
        analogous: { name: 'Analogous Harmony', colors: generateAnalogousPalette(primaryPalette) },
        warm: { name: 'Warm Tones', colors: generateWarmPalette(primaryPalette) },
        cool: { name: 'Cool Tones', colors: generateCoolPalette(primaryPalette) }
      };
      
      const imageData = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: formatFileSize(file.size),
        url: URL.createObjectURL(file),
        palettes,
        microColors
      };
      processedImages.push(imageData);
      
      // Auto-select first image
      if (processedImages.length === 1) {
        selectImage(imageData.id);
      }
      
      renderThumbnails();
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      showToast(`Error processing ${file.name}`);
    }
  }
}

async function extractMicroPalette(file, colorCount) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          const palette = getMicroColorsFromImage(img, colorCount);
          resolve(palette);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMicroColorsFromImage(img, colorCount) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Smaller size for micro palette
  const maxSize = 100;
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  canvas.width = Math.max(Math.floor(img.width * scale), 1);
  canvas.height = Math.max(Math.floor(img.height * scale), 1);
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  // Extract unique colors
  const uniqueColors = extractUniqueColors(pixels);
  
  // Use k-means to get 256 colors
  const colors = kMeansClustering(uniqueColors, Math.min(colorCount, uniqueColors.length));
  
  return colors.map(color => {
    const rgbColor = {
      mode: 'rgb',
      r: color[0] / 255,
      g: color[1] / 255,
      b: color[2] / 255
    };
    
    const oklchColor = rgbToOklch(rgbColor);
    
    return {
      rgb: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      hex: rgbToHex(color[0], color[1], color[2]),
      oklch: formatCss(oklchColor),
      oklchFormatted: formatOklchReadable(oklchColor)
    };
  });
}

async function extractPalette(file, colorCount) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          const palette = getColorsFromImage(img, colorCount);
          resolve(palette);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getColorsFromImage(img, colorCount) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Resize image more aggressively for better sampling diversity
  const maxSize = 150;
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  canvas.width = Math.max(Math.floor(img.width * scale), 1);
  canvas.height = Math.max(Math.floor(img.height * scale), 1);
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  // Extract unique colors only
  const uniqueColors = extractUniqueColors(pixels);
  
  // Use k-means clustering on unique colors
  const colors = kMeansClustering(uniqueColors, colorCount);
  
  return colors.map(color => {
    // Convert RGB to OKLCH using culori
    const rgbColor = {
      mode: 'rgb',
      r: color[0] / 255,
      g: color[1] / 255,
      b: color[2] / 255
    };
    
    const oklchColor = rgbToOklch(rgbColor);
    
    return {
      rgb: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      hex: rgbToHex(color[0], color[1], color[2]),
      oklch: formatCss(oklchColor),
      oklchValues: {
        l: oklchColor.l !== undefined ? (oklchColor.l * 100).toFixed(1) : '0',
        c: oklchColor.c !== undefined ? oklchColor.c.toFixed(3) : '0',
        h: oklchColor.h !== undefined ? oklchColor.h.toFixed(1) : '0'
      }
    };
  });
}

function extractUniqueColors(pixels) {
  // Use a Map to store unique colors with their frequency
  const colorMap = new Map();
  
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    // Quantize colors to reduce near-duplicates (group similar colors)
    // This helps reduce millions of slightly different colors to manageable unique set
    const quantize = 8; // Reduce 256 values to 32 buckets (256/8)
    const qr = Math.floor(r / quantize) * quantize;
    const qg = Math.floor(g / quantize) * quantize;
    const qb = Math.floor(b / quantize) * quantize;
    
    // Create a unique key for this color
    const colorKey = `${qr},${qg},${qb}`;
    
    if (colorMap.has(colorKey)) {
      colorMap.set(colorKey, colorMap.get(colorKey) + 1);
    } else {
      colorMap.set(colorKey, 1);
    }
  }
  
  // Convert map to array of [r, g, b] with frequency weighting
  const uniqueColors = [];
  colorMap.forEach((count, key) => {
    const [r, g, b] = key.split(',').map(Number);
    // Add color multiple times based on frequency (capped for performance)
    const weight = Math.min(count, 10);
    for (let i = 0; i < weight; i++) {
      uniqueColors.push([r, g, b]);
    }
  });
  
  console.log(`Reduced ${pixels.length / 4} pixels to ${colorMap.size} unique colors (${uniqueColors.length} weighted samples)`);
  
  return uniqueColors;
}

function kMeansClustering(samples, k, maxIterations = 15) {
  if (samples.length === 0) return [];
  
  // If we have fewer unique colors than requested, return all of them
  if (samples.length <= k) {
    return samples;
  }
  
  // Initialize centroids using k-means++ for better initial distribution
  let centroids = [];
  
  // First centroid is random
  centroids.push(samples[Math.floor(Math.random() * samples.length)]);
  
  // Choose remaining centroids with probability proportional to distance squared
  for (let i = 1; i < k; i++) {
    const distances = samples.map(sample => {
      const minDist = Math.min(...centroids.map(c => colorDistance(sample, c)));
      return minDist * minDist;
    });
    
    const totalDist = distances.reduce((sum, d) => sum + d, 0);
    let random = Math.random() * totalDist;
    
    for (let j = 0; j < samples.length; j++) {
      random -= distances[j];
      if (random <= 0) {
        centroids.push(samples[j]);
        break;
      }
    }
  }
  
  // K-means iterations
  let converged = false;
  for (let iter = 0; iter < maxIterations && !converged; iter++) {
    const clusters = Array.from({ length: k }, () => []);
    
    // Assign samples to nearest centroid
    samples.forEach(sample => {
      let minDist = Infinity;
      let clusterIndex = 0;
      
      centroids.forEach((centroid, i) => {
        const dist = colorDistance(sample, centroid);
        if (dist < minDist) {
          minDist = dist;
          clusterIndex = i;
        }
      });
      
      clusters[clusterIndex].push(sample);
    });
    
    // Update centroids
    const newCentroids = clusters.map((cluster, idx) => {
      if (cluster.length === 0) {
        // Keep the old centroid if no samples assigned
        return centroids[idx];
      }
      
      const sum = cluster.reduce(
        (acc, color) => [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]],
        [0, 0, 0]
      );
      
      return [
        Math.round(sum[0] / cluster.length),
        Math.round(sum[1] / cluster.length),
        Math.round(sum[2] / cluster.length)
      ];
    });
    
    // Check for convergence
    converged = centroids.every((c, i) => 
      c[0] === newCentroids[i][0] && 
      c[1] === newCentroids[i][1] && 
      c[2] === newCentroids[i][2]
    );
    
    centroids = newCentroids;
  }
  
  // Sort by frequency (most common colors first)
  const clusterSizes = centroids.map((centroid, i) => {
    const cluster = samples.filter(sample => {
      let minDist = Infinity;
      let minIndex = 0;
      centroids.forEach((c, j) => {
        const dist = colorDistance(sample, c);
        if (dist < minDist) {
          minDist = dist;
          minIndex = j;
        }
      });
      return minIndex === i;
    });
    return { centroid, size: cluster.length };
  });
  
  clusterSizes.sort((a, b) => b.size - a.size);
  return clusterSizes.map(c => c.centroid);
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Generate palette variations using OKLCH transformations
function generateSoftPalette(primaryPalette) {
  return primaryPalette.map(color => {
    const oklchColor = rgbToOklch(color.hex);
    
    // Make softer: increase lightness, decrease chroma
    const softColor = {
      mode: 'oklch',
      l: Math.min(oklchColor.l + 0.15, 0.95), // Lighter
      c: oklchColor.c * 0.4, // Much less saturated
      h: oklchColor.h
    };
    
    return createColorObject(softColor);
  });
}

function generateInvertedPalette(primaryPalette) {
  return primaryPalette.map(color => {
    const oklchColor = rgbToOklch(color.hex);
    
    // Invert: rotate hue 180 degrees (complementary), invert lightness
    const invertedColor = {
      mode: 'oklch',
      l: 1 - oklchColor.l, // Invert lightness
      c: oklchColor.c, // Keep same chroma
      h: oklchColor.h !== undefined ? (oklchColor.h + 180) % 360 : undefined // Opposite hue
    };
    
    return createColorObject(invertedColor);
  });
}

function generateVibrantPalette(primaryPalette) {
  return primaryPalette.map(color => {
    const oklchColor = rgbToOklch(color.hex);
    
    // Make vibrant: increase chroma, optimize lightness for max saturation
    const vibrantColor = {
      mode: 'oklch',
      l: Math.max(0.4, Math.min(0.7, oklchColor.l)), // Mid-range lightness for vibrancy
      c: Math.min(oklchColor.c * 1.8, 0.37), // Much more saturated (cap at OKLCH max)
      h: oklchColor.h
    };
    
    return createColorObject(vibrantColor);
  });
}

function generateHighlighterPalette(primaryPalette) {
  // Step 1: Extract all unique hues from primary palette
  const primaryHues = primaryPalette
    .map(color => {
      const oklchColor = rgbToOklch(color.hex);
      return oklchColor.h !== undefined ? oklchColor.h : 0;
    })
    .sort((a, b) => a - b);
  
  // Step 2: Find the most diverse set of hues by maximizing angular distance
  const diverseHues = selectMostDiverseHues(primaryHues, primaryPalette.length);
  
  // Step 3: Apply highlighter effect to these diverse hues
  return diverseHues.map(hue => {
    const targetLightness = 0.8; // Sweet spot for highlighter effect
    const maxChroma = getMaxChromaForHue(hue, targetLightness);
    
    const highlighterColor = {
      mode: 'oklch',
      l: targetLightness,
      c: maxChroma,
      h: hue
    };
    
    return createColorObject(highlighterColor);
  });
}

function selectMostDiverseHues(hues, count) {
  if (hues.length === 0) {
    // No hues available, create evenly distributed hues
    return Array.from({ length: count }, (_, i) => (360 / count) * i);
  }
  
  if (hues.length <= count) {
    return hues;
  }
  
  // Find the primary hue (most central/representative)
  const startHue = hues[Math.floor(hues.length / 2)];
  
  // Redistribute hues to maximize angular distance
  // Strategy: Space them evenly around the color wheel
  const angleStep = 360 / count;
  const diverseHues = [];
  
  for (let i = 0; i < count; i++) {
    // Start from the primary hue and distribute evenly
    const targetAngle = (startHue + (angleStep * i)) % 360;
    diverseHues.push(targetAngle);
  }
  
  return diverseHues;
}

function getMaxChromaForHue(hue, lightness) {
  // Different hues have different maximum chroma at different lightness levels
  // This is an approximation based on OKLCH's gamut
  
  // Normalize hue
  const h = hue !== undefined ? hue % 360 : 0;
  
  // These are approximate max chroma values for different hue ranges at L=0.8
  // Yellow/Green (60-120): highest chroma ~0.37
  // Blue (240-270): moderate chroma ~0.30
  // Red/Purple (330-30): moderate-high chroma ~0.32
  // Cyan (180-210): moderate chroma ~0.28
  
  let baseMaxChroma;
  
  if (h >= 60 && h <= 120) {
    // Yellow-Green range - highest chroma
    baseMaxChroma = 0.37;
  } else if (h >= 240 && h <= 270) {
    // Blue range
    baseMaxChroma = 0.31;
  } else if ((h >= 0 && h <= 30) || (h >= 330 && h <= 360)) {
    // Red range
    baseMaxChroma = 0.33;
  } else if (h >= 180 && h <= 210) {
    // Cyan range
    baseMaxChroma = 0.29;
  } else if (h >= 270 && h <= 330) {
    // Purple/Magenta range
    baseMaxChroma = 0.32;
  } else {
    // Other ranges
    baseMaxChroma = 0.35;
  }
  
  // Adjust for lightness - chroma capacity changes with lightness
  // At very high lightness (0.9+) or very low (0.2-), chroma capacity drops
  const lightnessAdjustment = Math.sin((lightness - 0.1) * Math.PI);
  
  return baseMaxChroma * Math.max(0.7, lightnessAdjustment);
}

function generateMonochromePalette(primaryPalette) {
  return primaryPalette.map(color => {
    const oklchColor = rgbToOklch(color.hex);
    
    // Remove all color: set chroma to 0
    const monoColor = {
      mode: 'oklch',
      l: oklchColor.l,
      c: 0, // No chroma = grayscale
      h: oklchColor.h
    };
    
    return createColorObject(monoColor);
  });
}

function generateDarkPalette(primaryPalette) {
  return primaryPalette.map(color => {
    const oklchColor = rgbToOklch(color.hex);
    
    // Dark mode: reduce lightness significantly, keep chroma
    const darkColor = {
      mode: 'oklch',
      l: Math.max(0.15, oklchColor.l * 0.5), // Much darker, min 0.15 for visibility
      c: oklchColor.c * 0.9, // Slightly reduce chroma for dark mode
      h: oklchColor.h
    };
    
    return createColorObject(darkColor);
  });
}

function generateNeonPalette(primaryPalette) {
  return primaryPalette.map(color => {
    const oklchColor = rgbToOklch(color.hex);
    
    // Neon: max chroma, optimal lightness for glow effect
    const neonColor = {
      mode: 'oklch',
      l: 0.65, // Sweet spot for neon brightness
      c: Math.min(0.37, oklchColor.c * 2.5), // Push to maximum chroma
      h: oklchColor.h
    };
    
    return createColorObject(neonColor);
  });
}

function generateAnalogousPalette(primaryPalette) {
  return primaryPalette.map(color => {
    const oklchColor = rgbToOklch(color.hex);
    
    // Analogous: rotate hue by +30 degrees for harmony
    const analogousColor = {
      mode: 'oklch',
      l: oklchColor.l,
      c: oklchColor.c,
      h: oklchColor.h !== undefined ? (oklchColor.h + 30) % 360 : undefined
    };
    
    return createColorObject(analogousColor);
  });
}

function generateWarmPalette(primaryPalette) {
  return primaryPalette.map(color => {
    const oklchColor = rgbToOklch(color.hex);
    
    // Warm: shift hue toward red/orange/yellow range (0-60°)
    const warmColor = {
      mode: 'oklch',
      l: Math.max(0.45, oklchColor.l), // Slightly lighter for warmth
      c: oklchColor.c * 0.85, // Slightly less saturated
      h: oklchColor.h !== undefined ? 30 + (oklchColor.h * 0.2) : 30 // Shift to warm range
    };
    
    return createColorObject(warmColor);
  });
}

function generateCoolPalette(primaryPalette) {
  return primaryPalette.map(color => {
    const oklchColor = rgbToOklch(color.hex);
    
    // Cool: shift hue toward blue/cyan range (180-270°)
    const coolColor = {
      mode: 'oklch',
      l: Math.min(0.75, oklchColor.l + 0.05), // Slightly lighter for coolness
      c: oklchColor.c * 0.85, // Slightly less saturated
      h: oklchColor.h !== undefined ? 220 + (oklchColor.h * 0.2) : 220 // Shift to cool range
    };
    
    return createColorObject(coolColor);
  });
}

function createColorObject(oklchColor) {
  // Convert OKLCH back to RGB for hex representation
  const rgbColor = converter('rgb')(oklchColor);
  
  // Clamp RGB values
  const r = Math.round(Math.max(0, Math.min(255, rgbColor.r * 255)));
  const g = Math.round(Math.max(0, Math.min(255, rgbColor.g * 255)));
  const b = Math.round(Math.max(0, Math.min(255, rgbColor.b * 255)));
  
  return {
    rgb: `rgb(${r}, ${g}, ${b})`,
    hex: rgbToHex(r, g, b),
    oklch: formatCss(oklchColor),
    oklchFormatted: formatOklchReadable(oklchColor), // Human-readable version
    oklchValues: {
      l: oklchColor.l !== undefined ? (oklchColor.l * 100).toFixed(1) : '0',
      c: oklchColor.c !== undefined ? oklchColor.c.toFixed(3) : '0',
      h: oklchColor.h !== undefined ? oklchColor.h.toFixed(1) : '0'
    }
  };
}

function formatOklchReadable(oklchColor) {
  const l = oklchColor.l !== undefined ? (oklchColor.l * 100).toFixed(0) : '0';
  const c = oklchColor.c !== undefined ? oklchColor.c.toFixed(2) : '0.00';
  const h = oklchColor.h !== undefined ? Math.round(oklchColor.h) : '0';
  return `${l}% ${c} ${h}°`;
}

function selectImage(id) {
  activeImageId = id;
  const image = processedImages.find(img => img.id === id);
  if (!image) return;
  
  microPalette = image.microColors;
  renderThumbnails();
  renderPalettes(image);
  renderMicroPalette(image);
}

function renderThumbnails() {
  const thumbnailsList = document.getElementById('thumbnailSidebar');
  
  if (processedImages.length === 0) {
    thumbnailsList.innerHTML = '<div class="empty-state-small">No images yet</div>';
    return;
  }
  
  thumbnailsList.innerHTML = processedImages.map(img => `
    <div class="thumbnail-item ${img.id === activeImageId ? 'active' : ''}" onclick="selectImage(${img.id})">
      <img src="${img.url}" alt="${img.name}" class="thumbnail-image">
      <div class="thumbnail-info">
        <div class="thumbnail-name">${img.name}</div>
        <div class="thumbnail-size">${img.size}</div>
      </div>
    </div>
  `).join('');
}

function renderPalettes(imageData) {
  const palettesContainer = document.getElementById('palettesContainer');
  
  if (!imageData) {
    palettesContainer.innerHTML = '<div class="empty-state">Select an image to view palettes</div>';
    return;
  }
  
  const totalPalettes = Object.keys(imageData.palettes).length;
  
  palettesContainer.innerHTML = `
    <div class="palettes-header">
      <h2>${imageData.name}</h2>
      <p>${totalPalettes} palettes • ${imageData.palettes.primary.colors.length} colors each</p>
      <div class="header-actions">
        <button class="icon-btn" onclick="copyAllColors('${imageData.id}')">
          📋 Copy All
        </button>
        <button class="icon-btn" onclick="exportPalette('${imageData.id}')">
          ⬇️ Export
        </button>
      </div>
    </div>
    
    ${Object.entries(imageData.palettes).map(([key, palette]) => `
      <div class="palette-section">
        <h4 class="palette-title">${palette.name}</h4>
        <div class="palette">
          ${palette.colors.map((color, i) => `
            <div class="color-card">
              <div class="color-swatch" style="background: ${color.oklch}" onclick="copyColor('${color.oklch}', '${color.hex}')"></div>
              <div class="color-values">
                <div class="color-value color-value-oklch">
                  <span class="label">OKLCH</span>
                  <span class="value">${color.oklchFormatted}</span>
                </div>
                <div class="color-value">
                  <span class="label">HEX</span>
                  <span class="value">${color.hex}</span>
                </div>
                <div class="color-value">
                  <span class="label">RGB</span>
                  <span class="value">${color.rgb}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  `;
}

function renderMicroPalette(imageData) {
  const microContainer = document.getElementById('microPaletteContainer');
  
  if (!imageData || !imageData.microColors) {
    microContainer.innerHTML = '<div class="empty-state">No micro palette</div>';
    return;
  }
  
  microContainer.innerHTML = `
    <div class="micro-header">
      <h3>256 Color Sample</h3>
      <div id="selectedColorInfo" class="selected-color-info">
        <div class="info-label">Click a swatch</div>
      </div>
    </div>
    <div class="micro-grid">
      ${imageData.microColors.map((color, i) => `
        <div 
          class="micro-swatch" 
          style="background: ${color.hex}" 
          onclick="showMicroColorInfo('${color.oklchFormatted}', '${color.hex}', '${color.rgb}')"
          title="${color.hex}"
        ></div>
      `).join('')}
    </div>
  `;
}

window.selectImage = selectImage;

window.showMicroColorInfo = function(oklch, hex, rgb) {
  const infoDiv = document.getElementById('selectedColorInfo');
  infoDiv.innerHTML = `
    <div class="color-info-swatch" style="background: ${hex}"></div>
    <div class="color-info-details">
      <div><strong>OKLCH:</strong> ${oklch}</div>
      <div><strong>HEX:</strong> ${hex}</div>
      <div><strong>RGB:</strong> ${rgb}</div>
    </div>
  `;
};

window.copyColor = function(oklchValue, hexValue) {
  navigator.clipboard.writeText(oklchValue).then(() => {
    showToast(`Copied: ${hexValue}`);
  });
}

window.copyAllColors = function(id) {
  const image = processedImages.find(img => img.id == id);
  if (!image) return;
  
  const colorsText = Object.entries(image.palettes).map(([key, palette]) => {
    const paletteColors = palette.colors.map((color, i) => 
      `  Color ${i + 1}: ${color.oklch} / ${color.hex} / ${color.rgb}`
    ).join('\n');
    return `${palette.name}:\n${paletteColors}`;
  }).join('\n\n');
  
  navigator.clipboard.writeText(colorsText).then(() => {
    showToast('Copied all palettes!');
  });
}

window.exportPalette = function(id) {
  const image = processedImages.find(img => img.id == id);
  if (!image) return;
  
  const cssContent = Object.entries(image.palettes).map(([key, palette]) => {
    const vars = palette.colors.map((color, i) => 
      `  --${key}-${i + 1}: ${color.oklch};`
    ).join('\n');
    return `/* ${palette.name} */\n${vars}`;
  }).join('\n\n');
  
  const fullContent = `:root {\n${cssContent}\n}`;
  
  const blob = new Blob([fullContent], { type: 'text/css' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${image.name.replace(/\.[^/.]+$/, '')}-palettes.css`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('Palettes exported!');
}

function clearAllResults() {
  if (processedImages.length === 0) return;
  
  if (confirm('Clear all images?')) {
    processedImages.forEach(img => URL.revokeObjectURL(img.url));
    processedImages = [];
    activeImageId = null;
    microPalette = [];
    
    renderThumbnails();
    renderPalettes(null);
    renderMicroPalette(null);
    
    showToast('All images cleared');
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Add toast out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes toastOut {
    to {
      opacity: 0;
      transform: translateY(20px);
    }
  }
  @keyframes slideOut {
    to {
      opacity: 0;
      transform: translateX(-100%);
    }
  }
`;
document.head.appendChild(style);

