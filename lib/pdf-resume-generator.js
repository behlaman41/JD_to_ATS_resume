const PdfPrinter = require('pdfmake');
const fs = require('fs');

class PDFResumeGenerator {
  constructor() {
    this.fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    
    this.printer = new PdfPrinter(this.fonts);
    
    // Base template from sample resume
    this.baseTemplate = {
      name: 'Aman Behl',
      title: 'NodeJS Developer | Backend Software Engineer',
      contact: {
        email: 'behlaman41@gmail.com',
        phone: '+91-8851885063',
        linkedin: 'LinkedIn',
        location: 'Faridabad, Haryana'
      },
      summary: 'Results-driven Full-Stack Software Engineer with 3+ years expertise in Node.js, Bun, TypeScript, NestJS, and Elysia. Proven track record architecting high-performance applications serving 500+ daily users and processing 5000+ transactions with 99.9% uptime.',
      skills: {
        'Languages & Runtime': ['JavaScript', 'TypeScript', 'Node.js', 'Bun'],
        'Frameworks': ['NestJS', 'Express.js', 'Elysia', 'Next.js', 'React.js'],
        'Databases & ORM': ['PostgreSQL', 'MongoDB', 'Prisma', 'Vector Databases'],
        'Cloud & DevOps': ['AWS (EC2, S3, Lambda, RDS)', 'Docker', 'CI/CD'],
        'APIs': ['REST', 'GraphQL', 'tRPC', 'OpenAI', 'Stripe', 'Twilio', 'Shopify'],
        'Security': ['JWT', 'OAuth', 'Firebase Auth', 'Role-based Access Control']
      },
      experience: {
        title: 'Software Engineer | Backend Development & System Architecture',
        achievements: [
          'Optimized high-traffic e-commerce platforms using NestJS, Node.js, and TypeScript, achieving 40% improvement in data processing efficiency',
          'Pioneered AI technology integration and automated communication tools, significantly improving system responsiveness across multiple platforms',
          'Led security implementation including API enhancements, JWT authentication, and AWS cloud storage solutions',
          'Managed microservices architecture using Docker containerization for enterprise-level applications with 99.9% uptime'
        ]
      },
      education: 'Bachelor of Technology - Computer Science | Bharati Vidyapeeth College of Engineering, Pune | 2017-2021',
      achievements: '40% system processing improvement • 500+ daily users management • 5000+ daily transactions handling • Zero data loss record',
      languages: 'English (Fluent), Hindi (Native) | Availability: Immediate | Relocation: Yes'
    };
  }
  
  generateResume(jdAnalysis, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const customizedResume = this.customizeResumeForJD(jdAnalysis);
        const docDefinition = this.createDocDefinition(customizedResume);
        
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const stream = fs.createWriteStream(outputPath);
        
        stream.on('finish', () => {
          console.log(`PDF generated successfully: ${outputPath}`);
          resolve(outputPath);
        });
        
        stream.on('error', (error) => {
          console.error(`PDF generation error: ${error.message}`);
          reject(error);
        });
        
        pdfDoc.pipe(stream);
        pdfDoc.end();
      } catch (error) {
        console.error(`PDF generation failed: ${error.message}`);
        reject(error);
      }
    });
  }
  
  customizeResumeForJD(jdAnalysis) {
    const customized = JSON.parse(JSON.stringify(this.baseTemplate));
    
    // Customize title based on JD
    if (jdAnalysis.jobTitle) {
      customized.title = this.adaptTitleToJD(jdAnalysis.jobTitle);
    }
    
    // Customize summary based on JD requirements
    customized.summary = this.adaptSummaryToJD(jdAnalysis);
    
    // Prioritize skills based on JD
    customized.skills = this.prioritizeSkillsForJD(jdAnalysis.skills);
    
    // Add relevant projects based on JD
    customized.projects = this.generateRelevantProjects(jdAnalysis);
    
    return customized;
  }
  
  adaptTitleToJD(jobTitle) {
    const title = jobTitle.toLowerCase();
    
    if (title.includes('full stack') || title.includes('fullstack')) {
      return 'Full Stack Developer | Node.js & React Specialist';
    }
    if (title.includes('backend') || title.includes('server')) {
      return 'Backend Developer | Node.js & Cloud Architecture';
    }
    if (title.includes('frontend') || title.includes('ui') || title.includes('react')) {
      return 'Frontend Developer | React & TypeScript Expert';
    }
    if (title.includes('devops') || title.includes('cloud')) {
      return 'DevOps Engineer | AWS & Docker Specialist';
    }
    if (title.includes('ai') || title.includes('machine learning')) {
      return 'AI/ML Engineer | Node.js & LLM Integration';
    }
    
    return 'Software Engineer | Full Stack Development';
  }
  
  adaptSummaryToJD(jdAnalysis) {
    const experience = jdAnalysis.experience || '3+ years';
    const skills = jdAnalysis.skills.slice(0, 5).join(', ');
    
    return `Results-driven Software Engineer with ${experience} expertise in ${skills}. Proven track record architecting high-performance applications serving 500+ daily users and processing 5000+ transactions with 99.9% uptime. Expert in AI-powered systems, microservices architecture, and cloud solutions, consistently achieving 40% performance improvements.`;
  }
  
  prioritizeSkillsForJD(jdSkills) {
    const baseSkills = this.baseTemplate.skills;
    const prioritized = {};
    
    // Reorder skills based on JD requirements
    const skillCategories = Object.keys(baseSkills);
    
    for (const category of skillCategories) {
      const categorySkills = baseSkills[category];
      const reordered = [];
      
      // Add JD-relevant skills first
      for (const skill of categorySkills) {
        if (jdSkills.some(jdSkill => 
          skill.toLowerCase().includes(jdSkill.toLowerCase()) ||
          jdSkill.toLowerCase().includes(skill.toLowerCase())
        )) {
          reordered.push(skill);
        }
      }
      
      // Add remaining skills
      for (const skill of categorySkills) {
        if (!reordered.includes(skill)) {
          reordered.push(skill);
        }
      }
      
      prioritized[category] = reordered;
    }
    
    return prioritized;
  }
  
  generateRelevantProjects(jdAnalysis) {
    const projects = [
      {
        name: 'MindCare - Learning Management System',
        tech: 'Bun, TypeScript, MongoDB, Elysia, FFmpeg',
        points: [
          'Architected high-performance LMS backend API with comprehensive course management, authentication, and content delivery',
          'Built automated video processing pipeline for HLS streaming (1080p/720p/480p) with AWS S3 integration',
          'Implemented JWT-based authentication with Firebase integration and role-based permissions'
        ]
      },
      {
        name: 'Brainvoy - AI Business Intelligence Platform',
        tech: 'NestJS, Docker, AWS, LLM',
        points: [
          'Developed AI-powered platform leveraging LLMs for intelligent data processing, reducing processing time by 40%',
          'Designed scalable microservices architecture with AWS integration for model deployment and real-time analytics'
        ]
      },
      {
        name: 'Bodt.io - AI Chat Integration Platform',
        tech: 'NestJS, TypeScript, PostgreSQL, Docker',
        points: [
          'Built AI-powered chat system with OpenAI API integration and vector database for embeddings optimization',
          'Integrated with Google Drive, SharePoint, Notion, WhatsApp, and Slack for workflow automation'
        ]
      }
    ];
    
    // Filter and prioritize projects based on JD skills
    return projects.filter(project => {
      const projectTech = project.tech.toLowerCase();
      return jdAnalysis.skills.some(skill => 
        projectTech.includes(skill.toLowerCase())
      );
    }).slice(0, 3); // Limit to top 3 relevant projects
  }
  
  createDocDefinition(resume) {
    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
        lineHeight: 1.2
      },
      content: [
        // Header
        {
          text: resume.name,
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 5]
        },
        {
          text: resume.title,
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 5]
        },
        {
          text: `Email: ${resume.contact.email} | Phone: ${resume.contact.phone} | LinkedIn: ${resume.contact.linkedin} | Location: ${resume.contact.location}`,
          style: 'contact',
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        
        // Professional Summary
        {
          text: 'Professional Summary',
          style: 'sectionHeader',
          margin: [0, 10, 0, 5]
        },
        {
          text: resume.summary,
          style: 'normal',
          margin: [0, 0, 0, 10]
        },
        
        // Technical Skills
        {
          text: 'Technical Skills',
          style: 'sectionHeader',
          margin: [0, 10, 0, 5]
        },
        ...this.createSkillsContent(resume.skills),
        
        // Key Projects
        {
          text: 'Key Projects',
          style: 'sectionHeader',
          margin: [0, 10, 0, 5]
        },
        ...this.createProjectsContent(resume.projects || []),
        
        // Professional Experience
        {
          text: 'Professional Experience',
          style: 'sectionHeader',
          margin: [0, 10, 0, 5]
        },
        {
          text: resume.experience.title,
          style: 'jobTitle',
          margin: [0, 0, 0, 5]
        },
        ...resume.experience.achievements.map(achievement => ({
          text: `• ${achievement}`,
          style: 'bulletPoint',
          margin: [0, 2, 0, 2]
        })),
        
        // Education & Achievements
        {
          text: 'Education & Achievements',
          style: 'sectionHeader',
          margin: [0, 10, 0, 5]
        },
        {
          text: resume.education,
          style: 'normal',
          margin: [0, 0, 0, 5]
        },
        {
          text: `Key Achievements: ${resume.achievements}`,
          style: 'normal',
          margin: [0, 0, 0, 5]
        },
        {
          text: resume.languages,
          style: 'normal',
          margin: [0, 0, 0, 0]
        }
      ],
      
      styles: {
        header: {
          fontSize: 16,
          bold: true
        },
        subheader: {
          fontSize: 11,
          italics: true
        },
        contact: {
          fontSize: 10
        },
        sectionHeader: {
          fontSize: 12,
          bold: true
        },
        jobTitle: {
          fontSize: 10,
          bold: true
        },
        bulletPoint: {
          fontSize: 10
        },
        normal: {
          fontSize: 10
        }
      }
    };
  }
  
  createSkillsContent(skills) {
    const content = [];
    
    for (const [category, skillList] of Object.entries(skills)) {
      content.push({
        text: `• ${category}: ${skillList.join(', ')}`,
        style: 'bulletPoint',
        margin: [0, 2, 0, 2]
      });
    }
    
    return content;
  }
  
  createProjectsContent(projects) {
    const content = [];
    
    for (const project of projects) {
      content.push({
        text: `${project.name} | ${project.tech}`,
        style: 'jobTitle',
        margin: [0, 5, 0, 2]
      });
      
      for (const point of project.points) {
        content.push({
          text: `• ${point}`,
          style: 'bulletPoint',
          margin: [0, 2, 0, 2]
        });
      }
    }
    
    return content;
  }
}

module.exports = PDFResumeGenerator;