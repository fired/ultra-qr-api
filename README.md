# QR Code Generator API Clone

## Features

- **Multiple formats**: PNG, GIF, JPEG, SVG, EPS
- **Customizable colors**: Foreground and background colors
- **Error correction levels**: L (Low), M (Medium), Q (Quality), H (High)
- **Size control**: Custom dimensions with validation
- **Margin and quiet zone**: Configurable spacing around QR codes
- **Charset handling**: UTF-8 and ISO-8859-1 support
- **GET and POST support**: Flexible parameter submission
- **Ultra-small file sizes**: Using pngquant optimization (up to 86% smaller)
- **High performance**: Concurrent bulk processing support

## Installation

1. Clone or download the project files
2. Install dependencies:
```bash
npm install
```

3. **Install pngquant optimization engine (optional but recommended)**
   
   **Windows:**
   - Download the latest version from [pngquant.org](https://pngquant.org/)
   - Extract `pngquant.exe` from the zip file
   - **Option A**: Add to system PATH:
     - Copy `pngquant.exe` to `C:\Windows\System32\` (requires admin)
     - Or add the folder containing `pngquant.exe` to your PATH environment variable
   - **Option B**: Place in project directory:
     - Copy `pngquant.exe` to your project root folder
   - **Verify installation**: Open Command Prompt and run `pngquant --version`
   
   **macOS:**
   ```bash
   # Using Homebrew (recommended)
   brew install pngquant
   
   # Using MacPorts
   sudo port install pngquant
   
   # Verify installation
   pngquant --version
   ```
   
   **Linux (Ubuntu/Debian):**
   ```bash
   sudo apt-get update
   sudo apt-get install pngquant
   
   # Verify installation
   pngquant --version
   ```
   
   **Linux (CentOS/RHEL/Fedora):**
   ```bash
   # CentOS/RHEL with EPEL
   sudo yum install epel-release
   sudo yum install pngquant
   
   # Fedora
   sudo dnf install pngquant
   
   # Verify installation
   pngquant --version
   ```

4. Start the server:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Usage

### Basic Example
```
GET /v1/create-qr-code/?data=HelloWorld&size=100x100
```

### Advanced Example
```
GET /v1/create-qr-code/?data=https://example.com&size=200x200&color=ff0000&bgcolor=ffffff&ecc=H&format=png&margin=5&qzone=4
```

### Ultra-Optimized Example (Smallest File Size)
```
GET /v1/create-qr-code/?data=OptimizedQR&size=200x200&depth=1&format=png&optimize=true
```

## Parameters

### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `data` | Text to encode in the QR code (URL-encoded) | `HelloWorld` |

### Optional Parameters

| Parameter | Description | Default | Valid Values |
|-----------|-------------|---------|--------------|
| `size` | Image dimensions in `WIDTHxHEIGHT` format | `200x200` | `10x10` to `1000x1000` |
| `charset-source` | Source text encoding | `UTF-8` | `UTF-8`, `ISO-8859-1` |
| `charset-target` | Target encoding for QR code | `UTF-8` | `UTF-8`, `ISO-8859-1` |
| `ecc` | Error correction level | `L` | `L`, `M`, `Q`, `H` |
| `color` | Foreground color | `0-0-0` (black) | RGB decimal (`255-0-0`) or hex (`ff0000`, `f00`) |
| `bgcolor` | Background color | `255-255-255` (white) | RGB decimal or hex format |
| `margin` | Margin in pixels | `1` | `0` to `50` |
| `qzone` | Quiet zone in modules | `0` | `0` to `100` |
| `format` | Output format | `png` | `png`, `gif`, `jpeg`, `jpg`, `svg`, `eps` |
| `depth` | Bit depth (raster formats only) | `24` | `1`, `8`, `16`, `24`, `32` |
| **`optimize`** | **Enable pngquant optimization for ultra-small files** | `false` | `true`, `false` |

## Optimization Features

### File Size Comparison

| Mode | File Size | Use Case |
|------|-----------|----------|
| **Standard PNG (24-bit)** | ~4-6KB | Regular use |
| **1-bit PNG** | ~2-3KB | Small files |
| **1-bit + Optimized** | **~400-1000 bytes** | **Ultra-small** |

### Optimization Algorithm

The API uses **pngquant** for aggressive PNG optimization:

1. **Color Reduction**: Converts to optimal palette
2. **Lossless Compression**: Maintains QR code scannability  
3. **Smart Fallback**: Uses original if optimization fails
4. **86% Size Reduction**: Typical optimization results

Example optimization output:
```
1-bit PNG generated: 2847 bytes at 96 DPI
PNG optimized: 2847 → 406 bytes (86% smaller)
```

## Color Format Examples

- **Decimal RGB**: `255-0-0` (red)
- **Hex (6 chars)**: `ff0000` (red)
- **Hex (3 chars)**: `f00` (red)

## Error Correction Levels

- **L (Low)**: ~7% error correction
- **M (Medium)**: ~15% error correction  
- **Q (Quality)**: ~25% error correction
- **H (High)**: ~30% error correction

## Bit Depth Options

The `depth` parameter controls the color depth of raster image formats:

- **1-bit**: Monochrome (black & white) - **smallest file size**
- **8-bit**: Grayscale - good compression with shades of gray
- **16-bit**: High-quality grayscale - more tonal range
- **24-bit**: Full color RGB (default) - standard color images
- **32-bit**: RGBA with transparency - includes alpha channel

**Optimization Tip**: Combine `depth=1` with `optimize=true` for ultra-small files (~400-1000 bytes)

**Note**: SVG and EPS formats ignore the depth parameter as they are vector formats.

## Usage Examples

### HTML Image Tag
```html
<img src="http://localhost:3000/v1/create-qr-code/?data=HelloWorld&size=100x100" alt="QR Code" />
```

### Custom Styled QR Code
```
/v1/create-qr-code/?data=StyledQR&size=300x300&color=2563eb&bgcolor=f8fafc&ecc=H&qzone=4&margin=10&format=png
```

### Ultra-Optimized QR Code (Smallest File Size)
```
/v1/create-qr-code/?data=Optimized&size=200x200&depth=1&format=png&optimize=true
```

### SVG for Print
```
/v1/create-qr-code/?data=PrintReady&size=500x500&format=svg&ecc=H&qzone=4
```

### 1-bit Monochrome (Small File Size)
```
/v1/create-qr-code/?data=Monochrome&size=200x200&depth=1&format=png
```

### 8-bit Grayscale
```
/v1/create-qr-code/?data=Grayscale&size=200x200&depth=8&format=png
```

### URL Encoding
```javascript
const data = encodeURIComponent("https://example.com/path?param=value");
const qrUrl = `http://localhost:3000/v1/create-qr-code/?data=${data}&size=200x200&optimize=true`;
```

## Bulk Processing

For generating thousands of QR codes, you can build your own bulk processing system using the API. Here are some recommendations:

### Performance Considerations for Bulk Generation

- **Concurrent requests**: Use 8 concurrent workers for optimal performance (tested configuration)
- **Fast mode**: Incredible speed (~220/sec) with 1-bit depth, no optimization
- **Optimized mode**: Much slower (~2.4/sec) but produces ultra-small files
- **Rate limiting**: The API has no built-in rate limiting, so manage your request rate
- **Error handling**: Implement retry logic for failed requests
- **Progress tracking**: Monitor success rates and processing speed

### Example Bulk Processing Strategies

**For maximum speed** (no optimization):
- Use `depth=1&format=png` (no `optimize=true`)
- Process with 10-15 concurrent requests
- Expect ~3KB file sizes

**For smallest files** (with optimization):
- Use `depth=1&format=png&optimize=true`
- Process with 3-6 concurrent requests (pngquant is CPU intensive)
- Expect ~400-1000 byte file sizes

### Performance Estimates

Based on real-world testing with 8 concurrent workers:

| System | Mode | Processing Rate | Estimated Time (9000 QR codes) |
|--------|------|----------------|---------------------------------|
| **Any System** | **Fast** (`depth=1`, no optimization) | **~220/sec** | **~40 seconds** |
| **Any System** | **Optimized** (`depth=1&optimize=true`) | **~2.4/sec** | **~1 hour** |

**Real Test Results**: 
- **Fast Mode**: 9,113 QR codes in 41.3 seconds (~220/sec)
- **Optimized Mode**: 9,113 QR codes in 1 hour 3 minutes (~2.4/sec)

**Performance Trade-off**: Optimization is ~90x slower but produces ultra-small files

### Implementation Tips

- **Test first**: Always test with a small batch before processing thousands
- **Monitor resources**: Watch CPU and memory usage during bulk processing  
- **Handle failures**: Some requests may fail due to server load
- **Batch processing**: Process in smaller batches for better control

## Testing

Run the test suite to verify functionality:

```bash
npm test
```

This will:
- Test all parameter combinations
- Generate sample QR codes in various formats
- Validate error handling
- Run performance tests
- **Test pngquant optimization** if installed

Test files will be saved in the `test_output/` directory.

### Manual Testing

Test the API with sample requests:

```bash
# Basic test
curl "http://localhost:3000/v1/create-qr-code/?data=Test&size=100x100"

# Optimized test  
curl "http://localhost:3000/v1/create-qr-code/?data=Test&size=75x75&format=png&depth=1&optimize=true"

# Full feature test
curl "http://localhost:3000/v1/create-qr-code/?data=FullTest&size=200x200&color=2563eb&bgcolor=f8fafc&ecc=H&format=png&depth=1&optimize=true"
```

## Development

For development with auto-restart:
```bash
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/create-qr-code/` | GET | Generate QR code with query parameters |
| `/v1/create-qr-code/` | POST | Generate QR code with form data |
| `/health` | GET | Health check endpoint |
| `/` | GET | API documentation |

## Dependencies

- **express**: Web server framework
- **qrcode**: QR code generation library
- **sharp**: Image processing for margins and format conversion
- **pngquant**: External optimization engine (optional)

## Production Deployment

### Environment Variables
```bash
PORT=3000  # Server port
NODE_ENV=production
```

### Docker Support
```dockerfile
FROM node:18-alpine

# Install pngquant for optimization
RUN apk add --no-cache pngquant

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Performance Considerations

- The API has no built-in rate limiting
- For high-traffic scenarios, consider:
  - Adding Redis for caching frequently requested QR codes
  - Implementing rate limiting middleware
  - Using a reverse proxy (nginx) for static file serving
  - Horizontal scaling with load balancing
  - **Pre-generating common QR codes** using bulk script

## Benchmarks

Real-world performance testing with 8 concurrent workers:

| Configuration | Test Size | Total Time | Processing Rate | Avg File Size |
|---------------|-----------|------------|-----------------|---------------|
| **Fast Mode** (`depth=1`, no optimization) | 9,113 QR codes | **41.3 seconds** | **~220/sec** | ~2-3KB |
| **Optimized Mode** (`depth=1&optimize=true`) | 9,113 QR codes | **1 hour 3 minutes** | **~2.4/sec** | ~400-1000 bytes |
| **QR Server API** | N/A | N/A | N/A (rate limited) | ~400-1000 bytes |

**Test Configuration**: 75x75 size, 1-bit depth, 8 concurrent workers  
**Hardware**: Results may vary based on CPU cores, pngquant version, and system load  
**Optimization Trade-off**: ~90x slower but 50-80% smaller files with pngquant

## Troubleshooting

### Common Issues

1. **"pngquant not found"**
   - Install pngquant from [pngquant.org](https://pngquant.org/)
   - Add to system PATH or project directory
   - Verify installation: `pngquant --version`

2. **"Network errors" during bulk processing**
   - Reduce concurrent request count
   - Check if API server is running on localhost:3000
   - Ensure your bulk processing system has proper error handling

3. **Slow bulk processing performance**
   - Use fast mode (no optimization) for speed
   - Ensure pngquant is properly installed for optimization mode
   - Check system resources (CPU/memory)
   - Consider reducing concurrent requests

4. **Large file sizes without optimization**
   - Ensure `optimize=true` parameter is set
   - Use `depth=1` for smallest files
   - Verify pngquant is installed and accessible

### Performance Tips

- **For maximum speed**: Use fast mode (no optimization) with 10-15 concurrent requests
- **For smallest files**: Use `depth=1&optimize=true` with 3-6 concurrent requests
- **For testing**: Always test with a small batch first
- **For stability**: Start with fewer concurrent requests and increase gradually

## License

MIT License - Feel free to use in your projects!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Acknowledgments

- **QR Server** for the original API inspiration
- **pngquant** for the excellent optimization engine
- **Node.js qrcode library** for QR code generation
- **Sharp** for advanced image processing

## Support

For issues or questions:
- Check the test output for debugging
- Review parameter validation
- Ensure all dependencies are installed correctly
- **Test optimization features** with single requests first
- **Check performance benchmarks** for your system specs when building bulk processing