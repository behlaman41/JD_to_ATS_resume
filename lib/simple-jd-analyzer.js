class JobDescriptionAnalyzer {
  constructor() {
    this.skillKeywords = {
      'JavaScript': ['javascript', 'js', 'node.js', 'nodejs', 'node js'],
      'TypeScript': ['typescript', 'ts'],
      'Python': ['python', 'django', 'flask', 'fastapi'],
      'Java': ['java', 'spring', 'springboot'],
      'React': ['react', 'reactjs', 'react.js'],
      'Angular': ['angular', 'angularjs'],
      'Vue': ['vue', 'vuejs', 'vue.js'],
      'Node.js': ['node.js', 'nodejs', 'node js', 'express', 'nestjs'],
      'AWS': ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'rds'],
      'Docker': ['docker', 'containerization', 'containers'],
      'Kubernetes': ['kubernetes', 'k8s'],
      'MongoDB': ['mongodb', 'mongo'],
      'PostgreSQL': ['postgresql', 'postgres'],
      'MySQL': ['mysql'],
      'Redis': ['redis'],
      'GraphQL': ['graphql'],
      'REST API': ['rest', 'restful', 'api'],
      'Git': ['git', 'github', 'gitlab'],
      'CI/CD': ['ci/cd', 'continuous integration', 'continuous deployment'],
      'Microservices': ['microservices', 'microservice'],
      'Machine Learning': ['machine learning', 'ml', 'ai', 'artificial intelligence'],
      'DevOps': ['devops', 'dev ops']
    };
    
    this.experienceKeywords = [
      'years of experience', 'years experience', 'year of experience',
      'experience in', 'experience with', 'minimum', 'at least',
      'senior', 'junior', 'mid-level', 'entry level'
    ];
    
    this.requirementKeywords = {
      required: ['required', 'must have', 'essential', 'mandatory', 'necessary'],
      preferred: ['preferred', 'nice to have', 'bonus', 'plus', 'advantage', 'desirable']
    };
  }
  
  analyzeJobDescription(text) {
    const normalizedText = text.toLowerCase();
    
    return {
      jobTitle: this.extractJobTitle(text),
      company: this.extractCompany(text),
      location: this.extractLocation(text),
      skills: this.extractSkills(normalizedText),
      experience: this.extractExperience(normalizedText),
      requirements: this.extractRequirements(text),
      summary: this.generateSummary(text)
    };
  }
  
  extractJobTitle(text) {
    const lines = text.split('\n');
    const titlePatterns = [
      /job title[:\s]+(.*)/i,
      /position[:\s]+(.*)/i,
      /role[:\s]+(.*)/i
    ];
    
    // Check first few lines for common job titles
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 5 && line.length < 100) {
        const commonTitles = [
          'software engineer', 'full stack', 'backend', 'frontend',
          'developer', 'programmer', 'architect', 'lead', 'senior',
          'junior', 'principal', 'staff'
        ];
        
        if (commonTitles.some(title => line.toLowerCase().includes(title))) {
          return line;
        }
      }
    }
    
    // Try pattern matching
    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Software Engineer';
  }
  
  extractCompany(text) {
    const companyPatterns = [
      /company[:\s]+(.*)/i,
      /organization[:\s]+(.*)/i,
      /employer[:\s]+(.*)/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim().split('\n')[0];
      }
    }
    
    return 'Technology Company';
  }
  
  extractLocation(text) {
    const locationPatterns = [
      /location[:\s]+(.*)/i,
      /based in[:\s]+(.*)/i,
      /office[:\s]+(.*)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim().split('\n')[0];
      }
    }
    
    return 'Remote/Hybrid';
  }
  
  extractSkills(normalizedText) {
    const foundSkills = [];
    
    for (const [skill, keywords] of Object.entries(this.skillKeywords)) {
      for (const keyword of keywords) {
        if (normalizedText.includes(keyword)) {
          if (!foundSkills.includes(skill)) {
            foundSkills.push(skill);
          }
          break;
        }
      }
    }
    
    return foundSkills;
  }
  
  extractExperience(normalizedText) {
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s*of\s*experience/i,
      /(\d+)\+?\s*years?\s*experience/i,
      /minimum\s*(\d+)\s*years?/i,
      /at\s*least\s*(\d+)\s*years?/i
    ];
    
    for (const pattern of experiencePatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        return `${match[1]}+ years`;
      }
    }
    
    // Check for level indicators
    if (normalizedText.includes('senior')) return '5+ years';
    if (normalizedText.includes('lead') || normalizedText.includes('principal')) return '7+ years';
    if (normalizedText.includes('junior') || normalizedText.includes('entry')) return '0-2 years';
    if (normalizedText.includes('mid-level')) return '3-5 years';
    
    return '2+ years';
  }
  
  extractRequirements(text) {
    const sentences = text.split(/[.!?]/);
    const requirements = {
      required: [],
      preferred: []
    };
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      
      // Check if it's a required skill
      if (this.requirementKeywords.required.some(keyword => lowerSentence.includes(keyword))) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 10 && cleanSentence.length < 200) {
          requirements.required.push(cleanSentence);
        }
      }
      
      // Check if it's a preferred skill
      if (this.requirementKeywords.preferred.some(keyword => lowerSentence.includes(keyword))) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 10 && cleanSentence.length < 200) {
          requirements.preferred.push(cleanSentence);
        }
      }
    }
    
    return requirements;
  }
  
  generateSummary(text) {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]/);
    
    // Get first meaningful paragraph or first few sentences
    let summary = '';
    let wordCount = 0;
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 20) {
        const sentenceWords = trimmed.split(/\s+/).length;
        if (wordCount + sentenceWords <= 100) {
          summary += trimmed + '. ';
          wordCount += sentenceWords;
        } else {
          break;
        }
      }
    }
    
    return summary.trim() || 'Exciting opportunity to work with cutting-edge technologies.';
  }
}

module.exports = JobDescriptionAnalyzer;