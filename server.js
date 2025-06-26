const express = require('express');
const QRCode = require('qrcode');
const sharp = require('sharp');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Utility function to check if pngquant is available
function isPngquantAvailable() {
  try {
    execSync('pngquant --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Utility function to optimize PNG using pngquant (like QR Server)
async function optimizePNG(buffer, depth) {
  if (!isPngquantAvailable()) {
    console.warn('pngquant not available - skipping optimization');
    return buffer;
  }

  try {
    // Create temporary files
    const tempDir = os.tmpdir();
    const inputFile = path.join(tempDir, `qr_input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`);
    const outputFile = path.join(tempDir, `qr_output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`);
    
    // Write input buffer to temp file
    fs.writeFileSync(inputFile, buffer);
    
    let command;
    if (depth === 1) {
      // Ultra aggressive optimization for 1-bit (like QR Server)
      command = `pngquant --force --quality=0-0 --speed=1 --output "${outputFile}" -- "${inputFile}"`;
    } else {
      // Standard optimization for other depths
      command = `pngquant --force --quality=0-50 --speed=1 --output "${outputFile}" -- "${inputFile}"`;
    }
    
    // Run pngquant
    execSync(command, { stdio: 'ignore' });
    
    // Read optimized result
    const optimizedBuffer = fs.readFileSync(outputFile);
    
    // Cleanup temp files
    try {
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    // Only return optimized version if it's actually smaller
    if (optimizedBuffer.length < buffer.length) {
      console.log(`PNG optimized: ${buffer.length} → ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length / buffer.length) * 100)}% smaller)`);
      return optimizedBuffer;
    } else {
      console.log('PNG optimization did not reduce file size, using original');
      return buffer;
    }
    
  } catch (error) {
    console.warn('PNG optimization failed:', error.message);
    return buffer; // Return original on error
  }
}
function parseColor(colorStr) {
  if (!colorStr) return null;
  
  // Hex format (3 or 6 chars)
  if (/^[a-fA-F0-9]{3}$/.test(colorStr)) {
    const r = parseInt(colorStr[0] + colorStr[0], 16);
    const g = parseInt(colorStr[1] + colorStr[1], 16);
    const b = parseInt(colorStr[2] + colorStr[2], 16);
    return { r, g, b };
  }
  
  if (/^[a-fA-F0-9]{6}$/.test(colorStr)) {
    const r = parseInt(colorStr.substring(0, 2), 16);
    const g = parseInt(colorStr.substring(2, 4), 16);
    const b = parseInt(colorStr.substring(4, 6), 16);
    return { r, g, b };
  }
  
  // Decimal format (r-g-b)
  const decimalMatch = colorStr.match(/^(\d+)-(\d+)-(\d+)$/);
  if (decimalMatch) {
    const r = parseInt(decimalMatch[1]);
    const g = parseInt(decimalMatch[2]);
    const b = parseInt(decimalMatch[3]);
    
    if (r <= 255 && g <= 255 && b <= 255) {
      return { r, g, b };
    }
  }
  
  return null;
}

// Utility function to validate size parameter
function parseSize(sizeStr) {
  if (!sizeStr) return { width: 200, height: 200, valid: true };
  
  const match = sizeStr.match(/^(\d+)x(\d+)$/);
  if (!match) return { width: 200, height: 200, valid: false };
  
  const width = parseInt(match[1]);
  const height = parseInt(match[2]);
  
  // Must be equal dimensions
  if (width !== height) return { width: 200, height: 200, valid: false };
  
  // Size limits
  if (width < 10 || height < 10) return { width: 200, height: 200, valid: false };
  if (width > 1000 || height > 1000) return { width: 200, height: 200, valid: false };
  
  return { width, height, valid: true };
}

// Utility function to convert charset
function convertCharset(text, sourceCharset, targetCharset) {
  // For simplicity, we'll handle basic UTF-8 and ISO-8859-1
  // In a production environment, you'd want to use a proper charset conversion library
  try {
    if (sourceCharset === 'ISO-8859-1' && targetCharset === 'UTF-8') {
      return Buffer.from(text, 'latin1').toString('utf8');
    } else if (sourceCharset === 'UTF-8' && targetCharset === 'ISO-8859-1') {
      return Buffer.from(text, 'utf8').toString('latin1');
    }
    return text;
  } catch (error) {
    return text;
  }
}

// Main QR code generation endpoint
app.get('/v1/create-qr-code/', async (req, res) => {
  try {
    // Extract parameters
    const params = { ...req.query, ...req.body };
    
    // Required parameter: data
    if (!params.data) {
      return res.status(400).json({ error: 'data parameter is required' });
    }
    
    // Parse parameters with defaults
    const data = decodeURIComponent(params.data);
    const sizeResult = parseSize(params.size);
    const size = { width: sizeResult.width, height: sizeResult.height };
    const charsetSource = (params['charset-source'] || 'UTF-8').toUpperCase();
    const charsetTarget = (params['charset-target'] || 'UTF-8').toUpperCase();
    const ecc = (params.ecc || 'L').toUpperCase();
    const colorResult = parseColor(params.color);
    const bgcolorResult = parseColor(params.bgcolor);
    const color = colorResult || { r: 0, g: 0, b: 0 };
    const bgcolor = bgcolorResult || { r: 255, g: 255, b: 255 };
    const margin = Math.max(0, Math.min(50, parseInt(params.margin) || 0));
    const qzone = Math.max(0, Math.min(100, parseInt(params.qzone) || 0));
    const format = (params.format || 'png').toLowerCase();
    const depth = parseInt(params.depth) || 24;
    const dpi = parseInt(params.dpi) || 96;
    const optimize = params.optimize === 'true' || params.optimize === '1';
    
    // Validate parameters
    if (params.size && !sizeResult.valid) {
      return res.status(400).json({ error: 'Invalid size parameter format. Use WIDTHxHEIGHT with equal dimensions (e.g., 200x200)' });
    }
    
    if (params.color && !colorResult) {
      return res.status(400).json({ error: 'Invalid color parameter format. Use RGB decimal (255-0-0) or hex (ff0000, f00)' });
    }
    
    if (params.bgcolor && !bgcolorResult) {
      return res.status(400).json({ error: 'Invalid bgcolor parameter format. Use RGB decimal (255-0-0) or hex (ff0000, f00)' });
    }
    
    // Validate parameters
    if (!['ISO-8859-1', 'UTF-8'].includes(charsetSource)) {
      return res.status(400).json({ error: 'Invalid charset-source parameter' });
    }
    
    if (!['ISO-8859-1', 'UTF-8'].includes(charsetTarget)) {
      return res.status(400).json({ error: 'Invalid charset-target parameter' });
    }
    
    if (!['L', 'M', 'Q', 'H'].includes(ecc)) {
      return res.status(400).json({ error: 'Invalid ecc parameter' });
    }
    
    if (!['png', 'gif', 'jpeg', 'jpg', 'svg', 'eps'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format parameter' });
    }
    
    if (params.depth && ![1, 8, 16, 24, 32].includes(depth)) {
      return res.status(400).json({ error: 'Invalid depth parameter. Valid values: 1, 8, 16, 24, 32' });
    }
    
    if (params.dpi && (dpi < 72 || dpi > 600)) {
      return res.status(400).json({ error: 'Invalid dpi parameter. Valid range: 72-600' });
    }
    
    if (params.dpi && (dpi < 72 || dpi > 600)) {
      return res.status(400).json({ error: 'Invalid dpi parameter. Valid range: 72-600' });
    }
    
    if (params.depth && ![1, 8, 16, 24, 32].includes(depth)) {
      return res.status(400).json({ error: 'Invalid depth parameter. Valid values: 1, 8, 16, 24, 32' });
    }
    
    // Convert charset if needed
    const convertedData = convertCharset(data, charsetSource, charsetTarget);
    
    // Map error correction levels
    const eccMap = {
      'L': 'low',
      'M': 'medium', 
      'Q': 'quartile',
      'H': 'high'
    };
    
    if (format === 'svg') {
      // Generate SVG
      const qrOptions = {
        errorCorrectionLevel: eccMap[ecc],
        type: 'svg',
        margin: qzone,
        color: {
          dark: `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`,
          light: `#${bgcolor.r.toString(16).padStart(2, '0')}${bgcolor.g.toString(16).padStart(2, '0')}${bgcolor.b.toString(16).padStart(2, '0')}`
        },
        width: size.width
      };
      
      const svgString = await QRCode.toString(convertedData, qrOptions);
      
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svgString);
    }
    
    if (format === 'eps') {
      // For EPS, generate SVG first then wrap in PostScript
      const qrOptions = {
        errorCorrectionLevel: eccMap[ecc],
        type: 'svg',
        margin: qzone,
        width: size.width
      };
      
      const svgString = await QRCode.toString(convertedData, qrOptions);
      
      // Basic EPS wrapper
      const epsContent = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${size.width} ${size.height}
%%Creator: QR Code Generator API
%%EndComments
% SVG content would be converted to PostScript here
% For simplicity, this is a placeholder
newpath
0 0 moveto
${size.width} 0 lineto
${size.width} ${size.height} lineto
0 ${size.height} lineto
closepath
stroke
%%EOF`;
      
      res.setHeader('Content-Type', 'application/postscript');
      return res.send(epsContent);
    }
    
    // Generate raster format (PNG, JPEG, GIF)
    const qrOptions = {
      errorCorrectionLevel: eccMap[ecc],
      margin: qzone,
      color: {
        dark: `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`,
        light: `#${bgcolor.r.toString(16).padStart(2, '0')}${bgcolor.g.toString(16).padStart(2, '0')}${bgcolor.b.toString(16).padStart(2, '0')}`
      },
      width: size.width
    };
    
    let buffer = await QRCode.toBuffer(convertedData, qrOptions);
    
    // Add margin using Sharp if needed
    if (margin > 0) {
      const currentSize = size.width;
      const newSize = currentSize + (margin * 2);
      
      buffer = await sharp(buffer)
        .extend({
          top: margin,
          bottom: margin,
          left: margin,
          right: margin,
          background: { r: bgcolor.r, g: bgcolor.g, b: bgcolor.b }
        })
        .resize(newSize, newSize, { fit: 'contain' })
        .toBuffer();
    }
    
    // Convert to requested format and bit depth
    if (format === 'jpeg' || format === 'jpg') {
      let sharpInstance = sharp(buffer).jpeg({ quality: 90 });
      
      // Apply bit depth conversion if specified
      if (depth === 8) {
        sharpInstance = sharpInstance.greyscale();
      }
      
      buffer = await sharpInstance.toBuffer();
      
      // Apply DPI metadata after conversion for JPEG
      buffer = await sharp(buffer)
        .withMetadata({ density: dpi })
        .jpeg({ quality: 90 })
        .toBuffer();
        
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (format === 'gif') {
      // Sharp doesn't support GIF output, so we'll convert to PNG instead
      let sharpInstance = sharp(buffer);
      
      // Apply bit depth conversion
      if (depth === 1) {
        sharpInstance = sharpInstance.threshold(128).png({ 
          palette: true,
          colors: 2,
          compressionLevel: 9
        });
      } else if (depth === 8) {
        sharpInstance = sharpInstance.greyscale().png();
      } else {
        sharpInstance = sharpInstance.png();
      }
      
      buffer = await sharpInstance.toBuffer();
      
      // Apply DPI metadata separately to preserve compression
      buffer = await sharp(buffer)
        .withMetadata({ density: dpi })
        .png({ compressionLevel: 9 })
        .toBuffer();
      
      res.setHeader('Content-Type', 'image/png');
    } else {
      // Default to PNG with bit depth control
      let sharpInstance = sharp(buffer);
      
      if (depth === 1) {
        // Convert to 1-bit (monochrome) with proper DPI
        buffer = await sharpInstance
          .threshold(128)
          .png({ 
            palette: true,
            colors: 2,
            compressionLevel: 9,
            effort: 10
          })
          .withMetadata({ 
            density: dpi 
          })
          .toBuffer();
          
                  console.log(`1-bit PNG generated: ${buffer.length} bytes at ${dpi} DPI`);
          
          // Apply aggressive optimization if requested
          if (optimize) {
            buffer = await optimizePNG(buffer, depth);
          }
          
          // Apply aggressive optimization if requested
          if (optimize) {
            buffer = await optimizePNG(buffer, depth);
          }
          
      } else if (depth === 8) {
        // Convert to 8-bit grayscale
        buffer = await sharpInstance
          .greyscale()
          .png({ compressionLevel: 9 })
          .withMetadata({ density: dpi })
          .toBuffer();
          
        // Apply optimization if requested
        if (optimize) {
          buffer = await optimizePNG(buffer, depth);
        }
          
        // Apply optimization if requested
        if (optimize) {
          buffer = await optimizePNG(buffer, depth);
        }
          
        // Apply optimization if requested
        if (optimize) {
          buffer = await optimizePNG(buffer, depth);
        }
          
        // Apply optimization if requested
        if (optimize) {
          buffer = await optimizePNG(buffer, depth);
        }
          
      } else if (depth === 16) {
        // 16-bit grayscale
        buffer = await sharpInstance
          .greyscale()
          .png({ compressionLevel: 9 })
          .withMetadata({ density: dpi })
          .toBuffer();
          
      } else {
        // 24-bit or 32-bit RGB/RGBA (default)
        buffer = await sharpInstance
          .png({ compressionLevel: 9 })
          .withMetadata({ density: dpi })
          .toBuffer();
          
        // Apply optimization if requested
        if (optimize) {
          buffer = await optimizePNG(buffer, depth);
        }
          
        // Apply optimization if requested
        if (optimize) {
          buffer = await optimizePNG(buffer, depth);
        }
      }
      
      res.setHeader('Content-Type', 'image/png');
    }
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Internal server error generating QR code', details: error.message });
  }
});

// POST endpoint (same functionality)
app.post('/v1/create-qr-code/', async (req, res) => {
  // Combine query and body parameters
  req.query = { ...req.query, ...req.body };
  
  // Call the same handler logic as GET
  try {
    // Extract parameters
    const params = { ...req.query, ...req.body };
    
    // Required parameter: data
    if (!params.data) {
      return res.status(400).json({ error: 'data parameter is required' });
    }
    
    // Parse parameters with defaults
    const data = decodeURIComponent(params.data);
    const sizeResult = parseSize(params.size);
    const size = { width: sizeResult.width, height: sizeResult.height };
    const charsetSource = (params['charset-source'] || 'UTF-8').toUpperCase();
    const charsetTarget = (params['charset-target'] || 'UTF-8').toUpperCase();
    const ecc = (params.ecc || 'L').toUpperCase();
    const colorResult = parseColor(params.color);
    const bgcolorResult = parseColor(params.bgcolor);
    const color = colorResult || { r: 0, g: 0, b: 0 };
    const bgcolor = bgcolorResult || { r: 255, g: 255, b: 255 };
    const margin = Math.max(0, Math.min(50, parseInt(params.margin) || 0));
    const qzone = Math.max(0, Math.min(100, parseInt(params.qzone) || 0));
    const format = (params.format || 'png').toLowerCase();
    
    // Validate parameters
    if (params.size && !sizeResult.valid) {
      return res.status(400).json({ error: 'Invalid size parameter format. Use WIDTHxHEIGHT with equal dimensions (e.g., 200x200)' });
    }
    
    if (params.color && !colorResult) {
      return res.status(400).json({ error: 'Invalid color parameter format. Use RGB decimal (255-0-0) or hex (ff0000, f00)' });
    }
    
    if (params.bgcolor && !bgcolorResult) {
      return res.status(400).json({ error: 'Invalid bgcolor parameter format. Use RGB decimal (255-0-0) or hex (ff0000, f00)' });
    }
    
    // Validate parameters
    if (!['ISO-8859-1', 'UTF-8'].includes(charsetSource)) {
      return res.status(400).json({ error: 'Invalid charset-source parameter' });
    }
    
    if (!['ISO-8859-1', 'UTF-8'].includes(charsetTarget)) {
      return res.status(400).json({ error: 'Invalid charset-target parameter' });
    }
    
    if (!['L', 'M', 'Q', 'H'].includes(ecc)) {
      return res.status(400).json({ error: 'Invalid ecc parameter' });
    }
    
    if (!['png', 'gif', 'jpeg', 'jpg', 'svg', 'eps'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format parameter' });
    }
    
    // Convert charset if needed
    const convertedData = convertCharset(data, charsetSource, charsetTarget);
    
    // Map error correction levels
    const eccMap = {
      'L': 'low',
      'M': 'medium', 
      'Q': 'quartile',
      'H': 'high'
    };
    
    if (format === 'svg') {
      // Generate SVG
      const qrOptions = {
        errorCorrectionLevel: eccMap[ecc],
        type: 'svg',
        margin: qzone,
        color: {
          dark: `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`,
          light: `#${bgcolor.r.toString(16).padStart(2, '0')}${bgcolor.g.toString(16).padStart(2, '0')}${bgcolor.b.toString(16).padStart(2, '0')}`
        },
        width: size.width
      };
      
      const svgString = await QRCode.toString(convertedData, qrOptions);
      
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svgString);
    }
    
    if (format === 'eps') {
      // For EPS, generate SVG first then wrap in PostScript
      const qrOptions = {
        errorCorrectionLevel: eccMap[ecc],
        type: 'svg',
        margin: qzone,
        width: size.width
      };
      
      const svgString = await QRCode.toString(convertedData, qrOptions);
      
      // Basic EPS wrapper
      const epsContent = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${size.width} ${size.height}
%%Creator: QR Code Generator API
%%EndComments
% SVG content would be converted to PostScript here
% For simplicity, this is a placeholder
newpath
0 0 moveto
${size.width} 0 lineto
${size.width} ${size.height} lineto
0 ${size.height} lineto
closepath
stroke
%%EOF`;
      
      res.setHeader('Content-Type', 'application/postscript');
      return res.send(epsContent);
    }
    
    // Generate raster format (PNG, JPEG, GIF)
    const qrOptions = {
      errorCorrectionLevel: eccMap[ecc],
      margin: qzone,
      color: {
        dark: `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`,
        light: `#${bgcolor.r.toString(16).padStart(2, '0')}${bgcolor.g.toString(16).padStart(2, '0')}${bgcolor.b.toString(16).padStart(2, '0')}`
      },
      width: size.width
    };
    
    let buffer = await QRCode.toBuffer(convertedData, qrOptions);
    
    // Add margin using Sharp if needed
    if (margin > 0) {
      const currentSize = size.width;
      const newSize = currentSize + (margin * 2);
      
      buffer = await sharp(buffer)
        .extend({
          top: margin,
          bottom: margin,
          left: margin,
          right: margin,
          background: { r: bgcolor.r, g: bgcolor.g, b: bgcolor.b }
        })
        .resize(newSize, newSize, { fit: 'contain' })
        .toBuffer();
    }
    
    // Convert to requested format if needed
    if (format === 'jpeg' || format === 'jpg') {
      buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (format === 'gif') {
      // Sharp doesn't support GIF output, so we'll convert to PNG instead
      buffer = await sharp(buffer).png().toBuffer();
      res.setHeader('Content-Type', 'image/png');
    } else {
      // Default to PNG
      buffer = await sharp(buffer).png().toBuffer();
      res.setHeader('Content-Type', 'image/png');
    }
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Internal server error generating QR code', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'QR Code Generator API' });
});

// API documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'QR Code Generator API',
    version: '1.0.0',
    description: 'QR Code API for generating QR codes',
    endpoints: {
      'GET /v1/create-qr-code/': 'Generate QR code with parameters',
      'POST /v1/create-qr-code/': 'Generate QR code with parameters (POST)',
      'GET /health': 'Health check endpoint'
    },
    parameters: {
      data: 'Text to encode (required)',
      size: 'Image size in format WIDTHxHEIGHT (default: 200x200)',
      'charset-source': 'Source charset (UTF-8, ISO-8859-1)',
      'charset-target': 'Target charset (UTF-8, ISO-8859-1)', 
      ecc: 'Error correction level (L, M, Q, H)',
      color: 'Foreground color (hex or decimal RGB)',
      bgcolor: 'Background color (hex or decimal RGB)',
      margin: 'Margin in pixels (0-50)',
      qzone: 'Quiet zone in modules (0-100)',
      format: 'Output format (png, gif, jpeg, jpg, svg, eps)',
      depth: 'Bit depth for raster formats (1, 8, 16, 24, 32)',
      dpi: 'DPI/resolution for raster formats (72-600, default: 96)',
      optimize: 'Aggressive PNG optimization like QR Server (true/false, default: false)'
    },
    examples: [
      '/v1/create-qr-code/?data=HelloWorld&size=100x100',
      '/v1/create-qr-code/?data=https://example.com&size=200x200&color=ff0000&bgcolor=ffffff',
      '/v1/create-qr-code/?data=Test&format=svg&ecc=H&qzone=4',
      '/v1/create-qr-code/?data=Monochrome&size=200x200&depth=1&format=png',
      '/v1/create-qr-code/?data=HighDPI&size=200x200&dpi=300&format=png',
      '/v1/create-qr-code/?data=Optimized&size=75x75&depth=1&optimize=true'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
  console.log(`QR Code Generator API listening on port ${port}`);
  console.log(`Test it: http://localhost:${port}/v1/create-qr-code/?data=HelloWorld&size=100x100`);
});

module.exports = app;