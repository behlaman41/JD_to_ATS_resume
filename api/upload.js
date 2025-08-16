const { JDToResumeConverter } = require('../jd-to-resume');
const multiparty = require('multiparty');
const fs = require('fs');
const path = require('path');

// Initialize converter
const converter = new JDToResumeConverter();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return new Promise((resolve, reject) => {
    const form = new multiparty.Form({
      maxFilesSize: 10 * 1024 * 1024, // 10MB limit
      uploadDir: '/tmp'
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      
      try {
        const uploadedFiles = files.jobDescriptions || [];
        
        if (uploadedFiles.length === 0) {
          return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log(`Processing ${uploadedFiles.length} files...`);
        
        const results = [];
        const outputDir = '/tmp/output';
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        for (const file of uploadedFiles) {
          try {
            // Validate file type
            const allowedTypes = ['.pdf', '.docx', '.txt'];
            const ext = path.extname(file.originalFilename).toLowerCase();
            if (!allowedTypes.includes(ext)) {
              throw new Error('Only PDF, DOCX, and TXT files are allowed');
            }

            const result = await converter.convertSingleJD(file.path, outputDir);
            
            if (result.success) {
              // Read the generated PDF and send as base64
              const pdfBuffer = fs.readFileSync(result.outputFile);
              result.pdfData = pdfBuffer.toString('base64');
              result.outputFile = path.basename(result.outputFile);
              result.reportFile = path.basename(result.reportFile);
            }
            
            results.push({
              originalName: file.originalFilename,
              ...result
            });
            
            // Clean up uploaded file
            fs.unlinkSync(file.path);
            
          } catch (error) {
            results.push({
              originalName: file.originalFilename,
              success: false,
              error: error.message
            });
          }
        }

        const successCount = results.filter(r => r.success).length;
        
        res.json({
          success: true,
          message: `Processed ${uploadedFiles.length} files. ${successCount} successful.`,
          results: results
        });
        resolve();

      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
        resolve();
      }
    });
  });
};