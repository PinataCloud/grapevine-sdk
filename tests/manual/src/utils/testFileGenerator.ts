export interface TestFileData {
  title: string;
  content?: string | ArrayBuffer | File | Blob;
  content_base64?: string;
  mimeType: string;
  description: string;
  tags: string[];
  isFile?: boolean;
  testType: 'raw' | 'base64';
}

export const generateTestFiles = async (): Promise<TestFileData[]> => {
  const timestamp = Date.now();
  const files: TestFileData[] = [];
  
  // Try to load actual binary files (both raw and base64 versions)
  console.log('🔍 Attempting to load binary test files...');
  try {
    const actualFiles = await loadActualTestFiles(timestamp);
    console.log(`✅ Successfully loaded ${actualFiles.length} binary files:`, actualFiles.map(f => f.title));
    files.push(...actualFiles);
  } catch (error) {
    console.error('❌ Failed to load actual files:', error);
    console.log('📝 Using programmatically generated content only');
  }
  
  // Create text file templates that will be generated in both raw and base64 formats
  const textFileTemplates = [
    {
      baseName: 'SVG Icon',
      content: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="#3b82f6" stroke="#1e40af" stroke-width="2"/>
        <text x="50" y="55" text-anchor="middle" fill="white" font-family="Arial" font-size="14">Test</text>
      </svg>`,
      mimeType: 'image/svg+xml',
      description: 'Test SVG icon with circle and text',
      tags: ['svg', 'vector', 'icon', 'test']
    },
    {
      baseName: 'HTML Document',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test HTML Document</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .highlight { background-color: #fef3c7; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Test HTML Document</h1>
    <p>This is a test HTML document created at <strong>${new Date().toISOString()}</strong>.</p>
    <div class="highlight">
        <p>This content demonstrates HTML rendering capabilities in the Grapevine SDK.</p>
    </div>
    <ul>
        <li>Feature 1: HTML parsing</li>
        <li>Feature 2: CSS styling</li>
        <li>Feature 3: Content display</li>
    </ul>
</body>
</html>`,
      mimeType: 'text/html',
      description: 'Sample HTML document with styling and structure',
      tags: ['html', 'web', 'document', 'test']
    },
    {
      baseName: 'Markdown Guide',
      content: `# Test Markdown Document

Generated at: ${new Date().toISOString()}

## Overview

This is a **test markdown document** that demonstrates various markdown features supported by the Grapevine SDK.

### Features Demonstrated

1. **Headers** - Multiple levels of headers
2. **Text formatting** - *italic*, **bold**, and \`inline code\`
3. **Lists** - Both ordered and unordered
4. **Links** - [Grapevine Documentation](https://docs.grapevine.fyi)
5. **Code blocks** - See example below

### Code Example

\`\`\`typescript
// Example TypeScript code
const grapevine = new GrapevineClient({
  privateKey: process.env.PRIVATE_KEY,
  network: 'testnet'
});

const feed = await grapevine.feeds.create({
  name: 'Test Feed',
  description: 'A test feed for demonstration'
});
\`\`\`

### Table Example

| Feature | Status | Notes |
|---------|--------|-------|
| Feeds | ✅ | Fully implemented |
| Entries | ✅ | Multiple formats |
| Categories | ✅ | Optional validation |

> This is a blockquote demonstrating another markdown feature.

---

*This document was auto-generated for testing purposes.*`,
      mimeType: 'text/markdown',
      description: 'Comprehensive markdown document with various formatting features',
      tags: ['markdown', 'documentation', 'guide', 'test']
    },
    {
      baseName: 'Plain Text Log',
      content: `GRAPEVINE SDK TEST LOG
Generated: ${new Date().toISOString()}
Test ID: ${timestamp}

==============================================

This is a plain text file containing test data for the Grapevine SDK.
It demonstrates handling of simple text content without any markup.

Test Scenarios:
- File upload and storage
- Content retrieval
- MIME type detection
- Text content processing

Log Entries:
[${new Date().toTimeString()}] Test file created
[${new Date().toTimeString()}] Content validation: PASSED
[${new Date().toTimeString()}] MIME type detection: text/plain
[${new Date().toTimeString()}] File ready for upload

Special Characters Test: !@#$%^&*()_+-=[]{}|;:'"<>?,.

Unicode Test: 🚀 🎉 ✨ 📊 🔥 💡 ⚡ 🌟

End of test log.`,
      mimeType: 'text/plain',
      description: 'Plain text log file with various character encodings',
      tags: ['text', 'log', 'plain', 'test']
    },
    {
      baseName: 'JSON Configuration',
      content: JSON.stringify({
        testConfig: {
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          testId: timestamp,
          environment: "test",
          features: {
            feeds: {
              enabled: true,
              maxEntries: 1000,
              supportedFormats: ["json", "html", "markdown", "text", "svg"]
            },
            categories: {
              enabled: true,
              validation: "optional",
              allowCustom: false
            },
            entries: {
              enabled: true,
              maxSize: "10MB",
              compression: true,
              encryption: false
            }
          },
          testData: {
            sampleStrings: ["hello", "world", "test"],
            sampleNumbers: [1, 2, 3, 42, 100],
            sampleBooleans: [true, false],
            sampleObject: {
              nested: {
                value: "deep nested value",
                array: [1, 2, 3]
              }
            }
          },
          metadata: {
            createdBy: "Grapevine SDK Test Suite",
            purpose: "Validate JSON content handling",
            tags: ["test", "json", "config"]
          }
        }
      }, null, 2),
      mimeType: 'application/json',
      description: 'JSON configuration file with nested objects and arrays',
      tags: ['json', 'config', 'api', 'test']
    }
  ];

  // Generate both raw and base64 versions of each text template
  for (const template of textFileTemplates) {
    const uniqueTimestamp = timestamp + Math.floor(Math.random() * 10000);
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    
    // Make content unique by adding timestamp and random data
    const uniqueContent = template.content + `\n\n<!-- Generated: ${uniqueTimestamp}-${randomSuffix} -->`;
    
    // Raw content version
    files.push({
      title: `${template.baseName} (Raw) ${uniqueTimestamp}`,
      content: uniqueContent,
      mimeType: template.mimeType,
      description: `${template.description} - Raw content version`,
      tags: [...template.tags, 'raw-content'],
      testType: 'raw'
    });
    
    // Base64 pre-encoded version - make this different from raw version
    const base64UniqueContent = template.content + `\n\n<!-- Generated Base64: ${uniqueTimestamp}-${randomSuffix}-b64 -->`;
    const contentBase64 = btoa(unescape(encodeURIComponent(base64UniqueContent)));
    files.push({
      title: `${template.baseName} (Base64) ${uniqueTimestamp}`,
      content_base64: contentBase64,
      mimeType: template.mimeType,
      description: `${template.description} - Pre-encoded base64 version`,
      tags: [...template.tags, 'base64-encoded'],
      testType: 'base64'
    });
  }
  
  console.log(`📋 Final file count: ${files.length} total files`);
  console.log(`📋 File types breakdown:`);
  console.log(`   - Binary files: ${files.filter(f => f.isFile).length}`);
  console.log(`   - Raw content: ${files.filter(f => f.testType === 'raw').length}`);
  console.log(`   - Base64 content: ${files.filter(f => f.testType === 'base64').length}`);
  
  return files;
};

/**
 * Load actual test files from the assets directory (both raw and base64 versions)
 */
async function loadActualTestFiles(timestamp: number): Promise<TestFileData[]> {
  const files: TestFileData[] = [];
  
  // Define file mappings for actual files (served from public directory)
  const fileMap = [
    { path: '/test-files/test-image.png', mimeType: 'image/png', type: 'PNG Image' },
    { path: '/test-files/test-image.jpg', mimeType: 'image/jpeg', type: 'JPEG Image' },
    { path: '/test-files/test-document.pdf', mimeType: 'application/pdf', type: 'PDF Document' },
    { path: '/test-files/archive.zip', mimeType: 'application/zip', type: 'ZIP Archive' }
  ];
  
  console.log(`📁 Looking for ${fileMap.length} files in public directory...`);
  
  for (const fileInfo of fileMap) {
    console.log(`🔍 Attempting to fetch: ${fileInfo.path}`);
    try {
      const response = await fetch(fileInfo.path);
      console.log(`📡 Fetch response for ${fileInfo.path}:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.ok) {
        const blob = await response.blob();
        console.log(`💾 Loaded blob for ${fileInfo.path}:`, {
          size: blob.size,
          type: blob.type,
          expectedType: fileInfo.mimeType
        });
        
        const uniqueTimestamp = timestamp + Math.floor(Math.random() * 1000);
        const uniqueTitle = `${fileInfo.type} ${uniqueTimestamp}`;
        
        // Create unique content by appending timestamp and random bytes to the original file
        const originalBytes = await blob.arrayBuffer();
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const timestampBytes = new TextEncoder().encode(`\n<!-- Unique: ${uniqueTimestamp}-${randomSuffix} -->`);
        const combinedBytes = new Uint8Array(originalBytes.byteLength + timestampBytes.byteLength);
        combinedBytes.set(new Uint8Array(originalBytes));
        combinedBytes.set(timestampBytes, originalBytes.byteLength);
        const uniqueBlob = new Blob([combinedBytes], { type: fileInfo.mimeType });
        
        // Raw binary content version
        files.push({
          title: `${uniqueTitle} (Raw Binary)`,
          content: uniqueBlob,
          mimeType: fileInfo.mimeType,
          description: `Actual ${fileInfo.type} file from test assets (${uniqueBlob.size} bytes) - Raw binary content`,
          tags: [fileInfo.type.toLowerCase().replace(' ', '-'), 'binary', 'actual-file', 'test', 'raw-content', `ts-${uniqueTimestamp}`],
          isFile: true,
          testType: 'raw'
        });
        
        // Base64 pre-encoded version - make it different by adding extra unique data
        const base64RandomSuffix = Math.random().toString(36).substring(2, 15);
        const base64TimestampBytes = new TextEncoder().encode(`\n<!-- Base64 Version: ${uniqueTimestamp}-${base64RandomSuffix}-b64 -->`);
        const base64CombinedBytes = new Uint8Array(originalBytes.byteLength + base64TimestampBytes.byteLength);
        base64CombinedBytes.set(new Uint8Array(originalBytes));
        base64CombinedBytes.set(base64TimestampBytes, originalBytes.byteLength);
        
        // Convert to base64
        let binaryString = '';
        for (let i = 0; i < base64CombinedBytes.length; i++) {
          binaryString += String.fromCharCode(base64CombinedBytes[i]);
        }
        const contentBase64 = btoa(binaryString);
        
        files.push({
          title: `${uniqueTitle} (Base64)`,
          content_base64: contentBase64,
          mimeType: fileInfo.mimeType,
          description: `Actual ${fileInfo.type} file from test assets (${base64CombinedBytes.length} bytes) - Pre-encoded base64`,
          tags: [fileInfo.type.toLowerCase().replace(' ', '-'), 'binary', 'actual-file', 'test', 'base64-encoded', `ts-${uniqueTimestamp}`],
          isFile: true,
          testType: 'base64'
        });
        
        console.log(`✅ Successfully loaded ${fileInfo.type} in both formats (${uniqueBlob.size} bytes)`);
      } else {
        console.warn(`⚠️ HTTP ${response.status} for ${fileInfo.path}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${fileInfo.path}:`, error);
    }
  }
  
  console.log(`📊 Total binary files loaded: ${files.length}/${fileMap.length * 2} (raw + base64 versions)`);
  return files;
}