const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

class JobDescriptionParser {
  async parseFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      let text = '';
      
      switch (ext) {
        case '.pdf':
          text = await this.parsePDF(filePath);
          break;
        case '.docx':
          text = await this.parseDOCX(filePath);
          break;
        case '.txt':
          text = await this.parseTXT(filePath);
          break;
        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }
      
      return this.normalizeText(text);
    } catch (error) {
      throw new Error(`Failed to parse ${filePath}: ${error.message}`);
    }
  }
  
  async parsePDF(filePath) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  
  async parseDOCX(filePath) {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  
  async parseTXT(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }
  
  normalizeText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  
  async parseMultipleFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const text = await this.parseFile(filePath);
        results.push({
          filePath,
          fileName: path.basename(filePath),
          text,
          success: true
        });
      } catch (error) {
        results.push({
          filePath,
          fileName: path.basename(filePath),
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }
}

module.exports = JobDescriptionParser;