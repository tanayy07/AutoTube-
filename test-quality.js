// Test script to verify quality selection
const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // Short test video

async function testQuality(quality) {
  console.log(`\n=== Testing ${quality} quality ===`);
  
  try {
    const response = await fetch('http://localhost:3000/api/download-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testUrl,
        quality: quality,
        format: 'mp4'
      })
    });

    if (response.ok) {
      const contentLength = response.headers.get('content-length');
      const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2);
      console.log(`✓ Success: ${quality} - Size: ${sizeMB} MB`);
      
      // Don't actually download, just check the size
      await response.body.cancel();
    } else {
      const error = await response.json();
      console.log(`✗ Failed: ${quality} - ${error.error}`);
    }
  } catch (error) {
    console.log(`✗ Error: ${quality} - ${error.message}`);
  }
}

// Test all qualities
async function runTests() {
  console.log('Testing YouTube quality selection...');
  console.log('URL:', testUrl);
  
  const qualities = ['360', '480', '720', '1080', 'best'];
  
  for (const quality of qualities) {
    await testQuality(quality);
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n=== Test Complete ===');
  console.log('Check if file sizes are different for each quality!');
}

runTests();
