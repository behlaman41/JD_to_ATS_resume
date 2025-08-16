#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const JobDescriptionParser = require('./lib/simple-jd-parser');
const JobDescriptionAnalyzer = require('./lib/simple-jd-analyzer');
const PDFResumeGenerator = require('./lib/pdf-resume-generator');

class JDToResumeConverter {
  constructor() {
    this.parser = new JobDescriptionParser();
    this.analyzer = new JobDescriptionAnalyzer();
    this.generator = new PDFResumeGenerator();
  }
  
  async convertSingleJD(inputPath, outputDir = './output') {
    try {
      console.log(`🔍 Processing: ${path.basename(inputPath)}`);
      
      // Parse JD
      const jdText = await this.parser.parseFile(inputPath);
      console.log('✅ Job description parsed successfully');
      
      // Analyze JD
      const analysis = this.analyzer.analyzeJobDescription(jdText);
      console.log('✅ Job description analyzed');
      console.log(`   - Job Title: ${analysis.jobTitle}`);
      console.log(`   - Skills Found: ${analysis.skills.length}`);
      console.log(`   - Experience: ${analysis.experience}`);
      
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Generate resume
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(outputDir, `${baseName}_ATS_Resume.pdf`);
      
      this.generator.generateResume(analysis, outputPath);
      console.log(`✅ Resume generated: ${outputPath}`);
      
      // Save analysis report
      const reportPath = path.join(outputDir, `${baseName}_Analysis.json`);
      fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
      console.log(`📊 Analysis report saved: ${reportPath}`);
      
      return {
        success: true,
        inputFile: inputPath,
        outputFile: outputPath,
        reportFile: reportPath,
        analysis
      };
      
    } catch (error) {
      console.error(`❌ Error processing ${inputPath}:`, error.message);
      return {
        success: false,
        inputFile: inputPath,
        error: error.message
      };
    }
  }
  
  async convertMultipleJDs(inputPaths, outputDir = './output') {
    console.log(`🚀 Processing ${inputPaths.length} job descriptions...\n`);
    
    const results = [];
    let successCount = 0;
    
    for (let i = 0; i < inputPaths.length; i++) {
      console.log(`[${i + 1}/${inputPaths.length}]`);
      const result = await this.convertSingleJD(inputPaths[i], outputDir);
      results.push(result);
      
      if (result.success) {
        successCount++;
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('📈 BATCH PROCESSING SUMMARY');
    console.log(`✅ Successful: ${successCount}/${inputPaths.length}`);
    console.log(`❌ Failed: ${inputPaths.length - successCount}/${inputPaths.length}`);
    
    if (successCount > 0) {
      console.log(`📁 Output directory: ${path.resolve(outputDir)}`);
    }
    
    return results;
  }
  
  async convertFromDirectory(inputDir, outputDir = './output') {
    const supportedExtensions = ['.pdf', '.docx', '.txt'];
    const files = fs.readdirSync(inputDir)
      .filter(file => supportedExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => path.join(inputDir, file));
    
    if (files.length === 0) {
      console.log('❌ No supported files found in directory');
      console.log('   Supported formats: PDF, DOCX, TXT');
      return [];
    }
    
    console.log(`📂 Found ${files.length} job description files`);
    return await this.convertMultipleJDs(files, outputDir);
  }
}

// CLI Interface (only when run directly)
function setupCLI() {
  const argv = yargs
    .usage('Usage: $0 [options]')
    .option('input', {
      alias: 'i',
      describe: 'Input file or directory containing job descriptions',
      type: 'string',
      demandOption: true
    })
    .option('output', {
      alias: 'o',
      describe: 'Output directory for generated resumes',
      type: 'string',
      default: './output'
    })
    .option('batch', {
      alias: 'b',
      describe: 'Process all files in input directory',
      type: 'boolean',
      default: false
    })
    .example('$0 -i job_description.pdf', 'Convert single job description')
    .example('$0 -i ./jds/ -b -o ./resumes/', 'Convert all JDs in directory')
    .example('$0 -i "jd1.pdf,jd2.docx,jd3.txt"', 'Convert multiple specific files')
    .help()
    .argv;
  
  return argv;
}

async function main() {
  const argv = setupCLI();
  const converter = new JDToResumeConverter();
  const inputPath = argv.input;
  const outputDir = argv.output;
  
  console.log('🎯 JD to ATS Resume Converter');
  console.log('================================\n');
  
  try {
    if (argv.batch) {
      // Process directory
      if (!fs.existsSync(inputPath)) {
        console.error('❌ Input directory does not exist');
        process.exit(1);
      }
      
      if (!fs.statSync(inputPath).isDirectory()) {
        console.error('❌ Input path is not a directory');
        process.exit(1);
      }
      
      await converter.convertFromDirectory(inputPath, outputDir);
      
    } else if (inputPath.includes(',')) {
      // Process multiple files
      const files = inputPath.split(',').map(f => f.trim());
      
      // Validate all files exist
      for (const file of files) {
        if (!fs.existsSync(file)) {
          console.error(`❌ File does not exist: ${file}`);
          process.exit(1);
        }
      }
      
      await converter.convertMultipleJDs(files, outputDir);
      
    } else {
      // Process single file
      if (!fs.existsSync(inputPath)) {
        console.error('❌ Input file does not exist');
        process.exit(1);
      }
      
      await converter.convertSingleJD(inputPath, outputDir);
    }
    
    console.log('\n🎉 Processing completed!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { JDToResumeConverter };