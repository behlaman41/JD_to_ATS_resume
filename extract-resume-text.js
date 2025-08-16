#!/usr/bin/env node

const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractResumeText() {
  try {
    const pdfBuffer = fs.readFileSync('Aman_Behl_ATS_Resume.pdf');
    const data = await pdfParse(pdfBuffer);
    
    console.log('=== EXTRACTED TEXT FROM RESUME ===');
    console.log(data.text);
    console.log('\n=== END OF TEXT ===');
    
    // Save to file for analysis
    fs.writeFileSync('sample_resume_text.txt', data.text);
    console.log('\nText saved to sample_resume_text.txt');
    
  } catch (error) {
    console.error('Error extracting text:', error);
  }
}

extractResumeText();