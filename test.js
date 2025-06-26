const fs = require('fs');
const path = require('path');

// Test the API endpoints
async function testAPI() {
  const baseURL = 'http://localhost:3000';
  
  console.log('Testing QR Code Generator API...\n');
  
  // Test cases
  const testCases = [
    {
      name: 'Basic QR Code',
      url: `${baseURL}/v1/create-qr-code/?data=HelloWorld&size=100x100`,
      filename: 'test_basic.png'
    },
    {
      name: 'Custom Colors',
      url: `${baseURL}/v1/create-qr-code/?data=CustomColors&size=200x200&color=ff0000&bgcolor=ffff00`,
      filename: 'test_colors.png'
    },
    {
      name: 'High Error Correction',
      url: `${baseURL}/v1/create-qr-code/?data=HighECC&size=150x150&ecc=H&qzone=4`,
      filename: 'test_ecc.png'
    },
    {
      name: 'JPEG Format',
      url: `${baseURL}/v1/create-qr-code/?data=JPEGFormat&size=200x200&format=jpeg`,
      filename: 'test_jpeg.jpg'
    },
    {
      name: 'SVG Format',
      url: `${baseURL}/v1/create-qr-code/?data=SVGFormat&size=200x200&format=svg`,
      filename: 'test_svg.svg'
    },
    {
      name: 'With Margin',
      url: `${baseURL}/v1/create-qr-code/?data=WithMargin&size=200x200&margin=10&qzone=2`,
      filename: 'test_margin.png'
    },
    {
      name: 'Long URL',
      url: `${baseURL}/v1/create-qr-code/?data=${encodeURIComponent('https://www.example.com/very/long/path/to/some/resource?param1=value1&param2=value2&param3=value3')}&size=300x300&ecc=M`,
      filename: 'test_url.png'
    },
    {
      name: '1-bit Depth (Monochrome)',
      url: `${baseURL}/v1/create-qr-code/?data=Monochrome&size=200x200&depth=1`,
      filename: 'test_1bit.png'
    },
    {
      name: '8-bit Grayscale',
      url: `${baseURL}/v1/create-qr-code/?data=Grayscale&size=200x200&depth=8`,
      filename: 'test_8bit.png'
    },
    {
      name: 'Bit Depth Comparison',
      url: `${baseURL}/v1/create-qr-code/?data=BitDepthTest&size=150x150&depth=1&color=000000&bgcolor=ffffff`,
      filename: 'test_bitdepth.png'
    },
    {
      name: '96 DPI (matches original API)',
      url: `${baseURL}/v1/create-qr-code/?data=96DPI&size=200x200&dpi=96`,
      filename: 'test_96dpi.png'
    },
    {
      name: 'High DPI (300 DPI for print)',
      url: `${baseURL}/v1/create-qr-code/?data=HighDPI&size=200x200&dpi=300`,
      filename: 'test_300dpi.png'
    },
    {
      name: 'Optimized 1-bit',
      url: `${baseURL}/v1/create-qr-code/?data=OptimizedQR&size=75x75&depth=1&optimize=true`,
      filename: 'test_optimized.png'
    },
    {
      name: 'Standard vs Optimized Comparison',
      url: `${baseURL}/v1/create-qr-code/?data=CompareOptimization&size=75x75&depth=1&optimize=false`,
      filename: 'test_standard.png'
    }
  ];
  
  // Create test output directory
  const outputDir = path.join(__dirname, 'test_output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`);
      console.log(`URL: ${testCase.url}`);
      
      const response = await fetch(testCase.url);
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const outputPath = path.join(outputDir, testCase.filename);
        fs.writeFileSync(outputPath, Buffer.from(buffer));
        console.log(`✅ Success! Saved to: ${outputPath}`);
        console.log(`File size: ${Buffer.from(buffer).length} bytes`);
      } else {
        console.log(`❌ Failed with status: ${response.status}`);
        const errorText = await response.text();
        console.log(`Error: ${errorText}`);
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('---\n');
    }
  }
  
  // Test error cases
  console.log('Testing error cases...\n');
  
  const errorTests = [
    {
      name: 'Missing data parameter',
      url: `${baseURL}/v1/create-qr-code/?size=100x100`
    },
    {
      name: 'Invalid size format',
      url: `${baseURL}/v1/create-qr-code/?data=test&size=100x200`
    },
    {
      name: 'Invalid color format',
      url: `${baseURL}/v1/create-qr-code/?data=test&color=invalidcolor`
    },
    {
      name: 'Invalid ECC level',
      url: `${baseURL}/v1/create-qr-code/?data=test&ecc=X`
    },
    {
      name: 'Invalid bit depth',
      url: `${baseURL}/v1/create-qr-code/?data=test&depth=7`
    },
    {
      name: 'Invalid DPI',
      url: `${baseURL}/v1/create-qr-code/?data=test&dpi=1000`
    }
  ];
  
  for (const errorTest of errorTests) {
    try {
      console.log(`Testing error case: ${errorTest.name}`);
      console.log(`URL: ${errorTest.url}`);
      
      const response = await fetch(errorTest.url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`✅ Correctly returned error: ${response.status}`);
        console.log(`Error message: ${errorText}`);
      } else {
        console.log(`❌ Should have failed but returned success`);
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.log(`Network error: ${error.message}`);
      console.log('---\n');
    }
  }
  
  console.log('Testing complete! Check the test_output directory for generated QR codes.');
}

// Performance test
async function performanceTest() {
  console.log('\nRunning performance test...');
  const baseURL = 'http://localhost:3000';
  const testUrl = `${baseURL}/v1/create-qr-code/?data=PerformanceTest&size=200x200`;
  
  const start = Date.now();
  const requests = 10;
  
  const promises = Array(requests).fill().map(() => fetch(testUrl));
  
  try {
    await Promise.all(promises);
    const end = Date.now();
    const totalTime = end - start;
    const avgTime = totalTime / requests;
    
    console.log(`✅ Generated ${requests} QR codes in ${totalTime}ms`);
    console.log(`Average time per request: ${avgTime.toFixed(2)}ms`);
  } catch (error) {
    console.log(`❌ Performance test failed: ${error.message}`);
  }
}

// Main test function
async function runTests() {
  console.log('QR Code Generator API - Test Suite');
  console.log('==========================================\n');
  
  // Check if server is running
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      console.log('✅ Server is running\n');
      await testAPI();
      await performanceTest();
    } else {
      console.log('❌ Server health check failed');
    }
  } catch (error) {
    console.log('❌ Cannot connect to server. Make sure it\'s running on port 3000.');
    console.log('Start the server with: npm start');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testAPI, performanceTest, runTests };