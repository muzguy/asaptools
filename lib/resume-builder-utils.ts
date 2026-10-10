export interface PersonalDetails {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  github?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  highlights: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  location?: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  honors?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  role?: string;
  technologies: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl?: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  description?: string;
}

export interface CustomSection {
  id: string;
  heading: string;
  items: CustomSectionItem[];
}

export type SectionKey =
  | 'summary'
  | 'education'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'certifications'
  | 'custom';

export type ResumeTemplateId = 'ats' | 'modern' | 'minimal' | 'executive' | 'compact';
export type ResumeTypography = 'sans' | 'serif' | 'mono';
export type PaperSize = 'a4' | 'letter';

export interface ResumeDesign {
  templateId: ResumeTemplateId;
  typography: ResumeTypography;
  accentColor: string;
  paperSize: PaperSize;
  fontSize: 'sm' | 'base' | 'lg';
  spacing: 'compact' | 'normal' | 'spacious';
}

export interface ResumeData {
  personal: PersonalDetails;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: SkillCategory[];
  certifications: CertificationItem[];
  customSections: CustomSection[];
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
  design: ResumeDesign;
}

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'summary',
  'education',
  'experience',
  'projects',
  'skills',
  'certifications',
  'custom',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Professional Summary',
  education: 'Education',
  experience: 'Work Experience',
  projects: 'Key Projects',
  skills: 'Technical & Professional Skills',
  certifications: 'Certifications & Licenses',
  custom: 'Additional Sections',
};

export interface TemplateMeta {
  id: ResumeTemplateId;
  name: string;
  badge?: string;
  description: string;
  idealFor: string;
}

export const TEMPLATES_LIST: TemplateMeta[] = [
  {
    id: 'ats',
    name: 'ATS Classic (Fresher & Student)',
    badge: 'High Parsing Rate',
    description: 'Clean single-column linear hierarchy designed specifically for Applicant Tracking Systems and campus recruitment.',
    idealFor: 'College students, new grads, interns, and online portal submissions.',
  },
  {
    id: 'modern',
    name: 'Modern Professional',
    badge: 'Popular',
    description: 'Crisp header styling with accent branding, elegant date alignment, and modern badge dividers.',
    idealFor: 'Software developers, product designers, and general technology roles.',
  },
  {
    id: 'minimal',
    name: 'Minimalist Editorial',
    badge: 'Refined',
    description: 'Refined typography, ample whitespace, and subtle hairline dividers for an elegant aesthetic.',
    idealFor: 'Senior ICs, consultants, designers, and research fellows.',
  },
  {
    id: 'executive',
    name: 'Executive Leadership',
    badge: 'Impact',
    description: 'Structured two-tone header banner with prominent contact positioning and leadership focus.',
    idealFor: 'Engineering managers, directors, team leads, and experienced professionals.',
  },
  {
    id: 'compact',
    name: 'Compact Single-Page',
    badge: 'High Density',
    description: 'Space-optimized layout engineered to fit rich project, experience, and skill lists onto 1 page.',
    idealFor: 'Candidates with extensive portfolios seeking strict 1-page compliance.',
  },
];

export interface AccentColorPreset {
  name: string;
  hex: string;
}

export const ACCENT_COLORS: AccentColorPreset[] = [
  { name: 'Slate Neutral', hex: '#0f172a' },
  { name: 'ASAP Orange', hex: '#ea580c' },
  { name: 'Sky Tech', hex: '#0284c7' },
  { name: 'Forest Emerald', hex: '#059669' },
  { name: 'Indigo Modern', hex: '#4f46e5' },
  { name: 'Classic Navy', hex: '#1e3a8a' },
  { name: 'Crimson Rose', hex: '#be123c' },
];

export const RESUME_STORAGE_KEY = 'asaptools_resume_builder_draft_v1';

/**
 * Creates a clean, empty resume structure ready for user inputs.
 */
export function createEmptyResume(): ResumeData {
  return {
    personal: {
      fullName: '',
      jobTitle: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
    },
    summary: '',
    experience: [],
    education: [],
    projects: [],
    skills: [
      {
        id: 'skill-lang',
        name: 'Languages & Core',
        skills: [],
      },
    ],
    certifications: [],
    customSections: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hiddenSections: [],
    design: {
      templateId: 'ats',
      typography: 'sans',
      accentColor: '#0f172a',
      paperSize: 'a4',
      fontSize: 'base',
      spacing: 'normal',
    },
  };
}

/**
 * Generates an honest, realistic sample resume (e.g. CS student/fresher Alex Morgan)
 * to showcase templates and formatting without fabricating outrageous achievements.
 */
export function createSampleResume(): ResumeData {
  return {
    personal: {
      fullName: 'Alex Morgan',
      jobTitle: 'Software Engineer & CS Graduate',
      email: 'alex.morgan@example.com',
      phone: '+1 (555) 234-5678',
      location: 'Seattle, WA',
      website: 'alexmorgan.dev',
      linkedin: 'linkedin.com/in/alexmorgan',
      github: 'github.com/alexmorgan',
    },
    summary:
      'Computer Science graduate with a strong foundation in distributed systems, web architectures, and algorithms. Experienced in building responsive full-stack applications with TypeScript and Go, with a focus on code readability, performance, and unit test coverage.',
    education: [
      {
        id: 'edu-1',
        institution: 'University of Washington',
        degree: 'Bachelor of Science in Computer Science',
        location: 'Seattle, WA',
        startDate: 'Sep 2020',
        endDate: 'Jun 2024',
        gpa: '3.82 / 4.0',
        honors: "Dean's List (6 Quarters), Outstanding Capstone Project Award",
      },
    ],
    experience: [
      {
        id: 'exp-1',
        company: 'CloudScale Technologies',
        position: 'Software Engineering Intern',
        location: 'Seattle, WA',
        startDate: 'Jun 2023',
        endDate: 'Sep 2023',
        current: false,
        highlights: [
          'Engineered an automated telemetry ingestion pipeline processing 1.5M log events daily using Node.js and Redis.',
          'Reduced p95 API response times by 32% by profiling SQL bottlenecks and implementing selective client-side caching.',
          'Wrote end-to-end integration test suites with 88% branch coverage, decreasing staging build failure rates.',
        ],
      },
      {
        id: 'exp-2',
        company: 'UW Department of Computer Science',
        position: 'Undergraduate Teaching Assistant (Data Structures)',
        location: 'Seattle, WA',
        startDate: 'Jan 2023',
        endDate: 'Jun 2023',
        current: false,
        highlights: [
          'Led weekly lab sections for 65 students covering binary search trees, graph algorithms, and Big-O runtime analysis.',
          'Held 4 hours of weekly office hours helping students debug Java and Python programming assignments.',
        ],
      },
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'Distributed Key-Value Store',
        role: 'Lead Developer',
        technologies: ['Go', 'Raft Consensus', 'gRPC', 'Docker'],
        link: 'github.com/alexmorgan/raft-kv',
        startDate: 'Jan 2024',
        endDate: 'Apr 2024',
        highlights: [
          'Implemented Raft consensus algorithm from scratch supporting leader election, log replication, and cluster membership changes.',
          'Achieved linearizable read/write semantics tested against simulated network partitions and packet drops.',
        ],
      },
      {
        id: 'proj-2',
        name: 'OpenDocs — Markdown Collaboration Tool',
        role: 'Full-Stack Developer',
        technologies: ['TypeScript', 'Next.js', 'Tailwind CSS', 'WebSockets'],
        link: 'opendocs-demo.dev',
        startDate: 'Oct 2023',
        endDate: 'Dec 2023',
        highlights: [
          'Built a real-time collaborative Markdown editor featuring live side-by-side rendering, export to PDF, and conflict-free editing.',
          'Deployed on Vercel with zero server dependencies utilizing client-side WebAssembly for instant Markdown compilation.',
        ],
      },
    ],
    skills: [
      {
        id: 'sk-lang',
        name: 'Programming Languages',
        skills: ['TypeScript', 'JavaScript', 'Go', 'Python', 'Java', 'SQL', 'HTML5', 'CSS3'],
      },
      {
        id: 'sk-fw',
        name: 'Frameworks & Libraries',
        skills: ['React', 'Next.js', 'Node.js', 'Express', 'Tailwind CSS', 'Jest'],
      },
      {
        id: 'sk-tools',
        name: 'Developer Tools & Platforms',
        skills: ['Git', 'Docker', 'Linux', 'Redis', 'PostgreSQL', 'Vercel', 'CI/CD Pipelines'],
      },
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'AWS Certified Cloud Practitioner',
        issuer: 'Amazon Web Services',
        date: 'Nov 2023',
        credentialUrl: 'https://aws.amazon.com/verification',
      },
    ],
    customSections: [],
    sectionOrder: ['summary', 'education', 'experience', 'projects', 'skills', 'certifications', 'custom'],
    hiddenSections: [],
    design: {
      templateId: 'ats',
      typography: 'sans',
      accentColor: '#0f172a',
      paperSize: 'a4',
      fontSize: 'base',
      spacing: 'normal',
    },
  };
}

/**
 * Validates personal contact details.
 */
export function validatePersonalDetails(personal: Partial<PersonalDetails>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!personal.fullName || !personal.fullName.trim()) {
    errors.fullName = 'Full name is required for your resume header.';
  }

  if (personal.email && personal.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personal.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates the complete resume and returns issues and warnings.
 */
export function validateResume(resume: ResumeData): {
  valid: boolean;
  errors: Record<string, string>;
  warnings: string[];
} {
  const personalVal = validatePersonalDetails(resume.personal);
  const errors = { ...personalVal.errors };
  const warnings: string[] = [];

  if (!resume.personal.email?.trim() && !resume.personal.phone?.trim()) {
    warnings.push('Add either an email or phone number so recruiters can contact you.');
  }

  if (!resume.summary?.trim() && resume.experience.length === 0 && resume.education.length === 0) {
    warnings.push('Add at least your Education or Work Experience.');
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

/**
 * Computes completeness score (0% - 100%) and helpful recommendations.
 */
export function getResumeCompleteness(resume: ResumeData): {
  score: number;
  completedCount: number;
  totalCount: number;
  tips: string[];
} {
  let completed = 0;
  const total = 7;
  const tips: string[] = [];

  // 1. Name & Title
  if (resume.personal.fullName.trim() && resume.personal.jobTitle.trim()) {
    completed++;
  } else {
    tips.push('Add your full name and target job title');
  }

  // 2. Contact details
  if (resume.personal.email.trim() && (resume.personal.phone.trim() || resume.personal.location.trim())) {
    completed++;
  } else {
    tips.push('Add contact email and location');
  }

  // 3. Summary
  if (resume.summary.trim().length > 30) {
    completed++;
  } else {
    tips.push('Write a 2-3 sentence professional summary');
  }

  // 4. Education
  if (resume.education.length > 0 && resume.education[0].institution.trim()) {
    completed++;
  } else {
    tips.push('Add your university or degree');
  }

  // 5. Experience
  if (resume.experience.length > 0 && resume.experience[0].company.trim()) {
    completed++;
  } else {
    tips.push('Add internship or job experience');
  }

  // 6. Projects
  if (resume.projects.length > 0 && resume.projects[0].name.trim()) {
    completed++;
  } else {
    tips.push('Add 1-2 notable projects');
  }

  // 7. Skills
  const totalSkills = resume.skills.reduce((acc, cat) => acc + cat.skills.length, 0);
  if (totalSkills >= 3) {
    completed++;
  } else {
    tips.push('List at least 3 relevant skills');
  }

  const score = Math.round((completed / total) * 100);

  return {
    score,
    completedCount: completed,
    totalCount: total,
    tips,
  };
}

/**
 * LocalStorage save helper with error handling.
 */
export function saveResumeToLocalStorage(resume: ResumeData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const payload = JSON.stringify(resume);
    localStorage.setItem(RESUME_STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * LocalStorage load helper.
 */
export function loadResumeFromLocalStorage(): ResumeData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.personal && typeof parsed.personal.fullName === 'string') {
      return parsed as ResumeData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clears saved resume draft from LocalStorage.
 */
export function clearResumeFromLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RESUME_STORAGE_KEY);
  } catch {
    // Ignore storage clear errors
  }
}

/**
 * Exports resume data as formatted JSON string for safe backup.
 */
export function exportResumeAsJson(resume: ResumeData): string {
  return JSON.stringify(resume, null, 2);
}

/**
 * Validates and imports a JSON string backup into a ResumeData structure.
 */
export function importResumeFromJson(jsonStr: string): {
  success: boolean;
  data?: ResumeData;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Uploaded file is not a valid JSON document.' };
    }

    if (!parsed.personal || typeof parsed.personal.fullName !== 'string') {
      return {
        success: false,
        error: 'JSON file is missing required resume data fields (personal.fullName).',
      };
    }

    // Fill in defaults for any missing arrays
    const sanitized: ResumeData = {
      personal: {
        fullName: parsed.personal.fullName || '',
        jobTitle: parsed.personal.jobTitle || '',
        email: parsed.personal.email || '',
        phone: parsed.personal.phone || '',
        location: parsed.personal.location || '',
        website: parsed.personal.website || '',
        linkedin: parsed.personal.linkedin || '',
        github: parsed.personal.github || '',
      },
      summary: parsed.summary || '',
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      customSections: Array.isArray(parsed.customSections) ? parsed.customSections : [],
      sectionOrder: Array.isArray(parsed.sectionOrder)
        ? parsed.sectionOrder
        : [...DEFAULT_SECTION_ORDER],
      hiddenSections: Array.isArray(parsed.hiddenSections) ? parsed.hiddenSections : [],
      design: {
        templateId: parsed.design?.templateId || 'ats',
        typography: parsed.design?.typography || 'sans',
        accentColor: parsed.design?.accentColor || '#0f172a',
        paperSize: parsed.design?.paperSize || 'a4',
        fontSize: parsed.design?.fontSize || 'base',
        spacing: parsed.design?.spacing || 'normal',
      },
    };

    return { success: true, data: sanitized };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: `Invalid JSON syntax: ${error.message}` };
  }
}

/**
 * Reorders a section key up or down in the section order array.
 */
export function moveSection(
  order: SectionKey[],
  sectionKey: SectionKey,
  direction: 'up' | 'down'
): SectionKey[] {
  const currentIndex = order.indexOf(sectionKey);
  if (currentIndex === -1) return order;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= order.length) return order;

  const newOrder = [...order];
  const [removed] = newOrder.splice(currentIndex, 1);
  newOrder.splice(targetIndex, 0, removed);
  return newOrder;
}

/**
 * Reorders an item within any array up or down.
 */
export function moveArrayItem<T>(items: T[], index: number, direction: 'up' | 'down'): T[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const newItems = [...items];
  const [removed] = newItems.splice(index, 1);
  newItems.splice(targetIndex, 0, removed);
  return newItems;
}
