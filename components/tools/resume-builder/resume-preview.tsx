'use client';

import React from 'react';
import {
  ResumeData,
  SectionKey,
  ExperienceItem,
  EducationItem,
  ProjectItem,
  SkillCategory,
  CertificationItem,
  CustomSection,
} from '@/lib/resume-builder-utils';
import {
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeIcon,
  LinkedInIcon,
  GitHubIcon,
} from '@/components/ui/icons';

interface ResumePreviewProps {
  resume: ResumeData;
  scale?: number;
  interactive?: boolean;
  onSectionClick?: (section: SectionKey) => void;
}

export function ResumePreview({
  resume,
  scale = 1.0,
  interactive = false,
  onSectionClick,
}: ResumePreviewProps) {
  const { personal, summary, experience, education, projects, skills, certifications, customSections, design } = resume;
  const { templateId, typography, accentColor, paperSize, fontSize, spacing } = design;

  // Typography class
  const fontClass =
    typography === 'serif'
      ? 'font-serif'
      : typography === 'mono'
      ? 'font-mono'
      : 'font-sans';

  // Base font size scaling
  const textScaleClass =
    fontSize === 'sm'
      ? 'text-[11px] leading-relaxed'
      : fontSize === 'lg'
      ? 'text-[13px] leading-relaxed'
      : 'text-[12px] leading-relaxed';

  // Section vertical spacing
  const sectionGapClass =
    spacing === 'compact' ? 'space-y-3' : spacing === 'spacious' ? 'space-y-6' : 'space-y-4';

  const itemGapClass =
    spacing === 'compact' ? 'space-y-2' : spacing === 'spacious' ? 'space-y-4' : 'space-y-3';

  // Helper to check if section is visible and has content
  const isSectionVisible = (key: SectionKey): boolean => {
    if (resume.hiddenSections.includes(key)) return false;
    switch (key) {
      case 'summary':
        return Boolean(summary?.trim());
      case 'experience':
        return experience.length > 0;
      case 'education':
        return education.length > 0;
      case 'projects':
        return projects.length > 0;
      case 'skills':
        return skills.some((s) => s.skills.length > 0);
      case 'certifications':
        return certifications.length > 0;
      case 'custom':
        return customSections.some((c) => c.items.length > 0);
      default:
        return false;
    }
  };

  // Render individual sections
  const renderSection = (key: SectionKey) => {
    if (!isSectionVisible(key)) return null;

    const clickableProps = interactive && onSectionClick
      ? {
          onClick: () => onSectionClick(key),
          className: 'cursor-pointer hover:ring-2 hover:ring-orange-500/30 rounded-lg p-1 -m-1 transition-all',
          title: `Click to edit ${key}`,
        }
      : {};

    switch (key) {
      case 'summary':
        return (
          <section key="summary" className="resume-section-block" {...clickableProps}>
            {renderSectionHeading('Professional Summary', 'SUMMARY')}
            <p className="text-zinc-700 leading-relaxed text-justify mt-1.5 whitespace-pre-line">
              {summary}
            </p>
          </section>
        );

      case 'education':
        return (
          <section key="education" className="resume-section-block" {...clickableProps}>
            {renderSectionHeading('Education', 'EDUCATION')}
            <div className={`mt-2 ${itemGapClass}`}>
              {education.map((edu: EducationItem) => (
                <div key={edu.id} className="resume-item-block">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <div>
                      <h4 className="font-bold text-zinc-900">{edu.institution}</h4>
                      <p className="text-zinc-700 font-medium italic">{edu.degree}</p>
                    </div>
                    <div className="text-right sm:shrink-0 text-zinc-600 text-[11px] font-medium">
                      <span>{edu.startDate} – {edu.endDate}</span>
                      {edu.location && <span> • {edu.location}</span>}
                    </div>
                  </div>
                  {(edu.gpa || edu.honors) && (
                    <div className="mt-1 text-[11px] text-zinc-600">
                      {edu.gpa && <span>GPA: <strong className="text-zinc-800">{edu.gpa}</strong></span>}
                      {edu.gpa && edu.honors && <span> • </span>}
                      {edu.honors && <span>{edu.honors}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'experience':
        return (
          <section key="experience" className="resume-section-block" {...clickableProps}>
            {renderSectionHeading('Work Experience', 'EXPERIENCE')}
            <div className={`mt-2 ${itemGapClass}`}>
              {experience.map((exp: ExperienceItem) => (
                <div key={exp.id} className="resume-item-block">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <div>
                      <h4 className="font-bold text-zinc-900">{exp.position}</h4>
                      <p className="text-zinc-700 font-medium">{exp.company}{exp.location ? `, ${exp.location}` : ''}</p>
                    </div>
                    <div className="text-right sm:shrink-0 text-zinc-600 text-[11px] font-medium">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </div>
                  </div>
                  {exp.highlights.length > 0 && (
                    <ul className="mt-1.5 space-y-1 list-disc list-outside ml-4 text-zinc-700">
                      {exp.highlights.filter(Boolean).map((h: string, idx: number) => (
                        <li key={idx} className="leading-snug">{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'projects':
        return (
          <section key="projects" className="resume-section-block" {...clickableProps}>
            {renderSectionHeading('Key Projects', 'PROJECTS')}
            <div className={`mt-2 ${itemGapClass}`}>
              {projects.map((proj: ProjectItem) => (
                <div key={proj.id} className="resume-item-block">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-zinc-900">{proj.name}</h4>
                      {proj.role && <span className="text-zinc-600 italic">({proj.role})</span>}
                      {proj.link && (
                        <a
                          href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                        >
                          {proj.link.replace(/^https?:\/\//, '')} ↗
                        </a>
                      )}
                    </div>
                    {(proj.startDate || proj.endDate) && (
                      <div className="text-right sm:shrink-0 text-zinc-600 text-[11px] font-medium">
                        {proj.startDate} {proj.endDate ? `– ${proj.endDate}` : ''}
                      </div>
                    )}
                  </div>
                  {proj.technologies.length > 0 && (
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      <span className="font-semibold text-zinc-700">Tech Stack:</span> {proj.technologies.join(', ')}
                    </p>
                  )}
                  {proj.highlights.length > 0 && (
                    <ul className="mt-1 space-y-1 list-disc list-outside ml-4 text-zinc-700">
                      {proj.highlights.filter(Boolean).map((h: string, idx: number) => (
                        <li key={idx} className="leading-snug">{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'skills':
        return (
          <section key="skills" className="resume-section-block" {...clickableProps}>
            {renderSectionHeading('Technical & Professional Skills', 'SKILLS')}
            <div className="mt-2 space-y-1.5">
              {skills.map((cat: SkillCategory) => (
                <div key={cat.id} className="text-zinc-800">
                  <span className="font-bold text-zinc-900">{cat.name}: </span>
                  <span className="text-zinc-700">{cat.skills.join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'certifications':
        return (
          <section key="certifications" className="resume-section-block" {...clickableProps}>
            {renderSectionHeading('Certifications & Licenses', 'CERTIFICATIONS')}
            <div className={`mt-2 ${itemGapClass}`}>
              {certifications.map((cert: CertificationItem) => (
                <div key={cert.id} className="flex items-baseline justify-between gap-2 resume-item-block">
                  <div>
                    <h4 className="font-bold text-zinc-900 inline">{cert.name}</h4>
                    <span className="text-zinc-600 text-[11px]"> — {cert.issuer}</span>
                    {cert.credentialUrl && (
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1.5 text-[10px] text-blue-600 hover:underline"
                      >
                        [Verify]
                      </a>
                    )}
                  </div>
                  <span className="text-zinc-600 text-[11px] shrink-0 font-medium">{cert.date}</span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'custom':
        return (
          <React.Fragment key="custom">
            {customSections.map((sec: CustomSection) => (
              <section key={sec.id} className="resume-section-block" {...clickableProps}>
                {renderSectionHeading(sec.heading, sec.heading.toUpperCase())}
                <div className={`mt-2 ${itemGapClass}`}>
                  {sec.items.map((item) => (
                    <div key={item.id} className="resume-item-block">
                      <div className="flex items-baseline justify-between gap-1">
                        <div>
                          <h4 className="font-bold text-zinc-900">{item.title}</h4>
                          {item.subtitle && <p className="text-zinc-600 italic text-[11px]">{item.subtitle}</p>}
                        </div>
                        {item.date && <span className="text-zinc-600 text-[11px] shrink-0">{item.date}</span>}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-zinc-700 whitespace-pre-line leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </React.Fragment>
        );

      default:
        return null;
    }
  };

  // Section Heading Renderer based on template
  const renderSectionHeading = (title: string, uppercaseTitle: string) => {
    if (templateId === 'ats') {
      return (
        <div className="border-b border-zinc-800 pb-0.5 mb-1.5">
          <h3 className="font-bold tracking-wider text-[11.5px] uppercase text-zinc-900">
            {uppercaseTitle}
          </h3>
        </div>
      );
    }

    if (templateId === 'minimal') {
      return (
        <div className="border-b border-zinc-300 pb-1 mb-2">
          <h3 className="font-serif tracking-widest text-[12px] uppercase text-zinc-800">
            {title}
          </h3>
        </div>
      );
    }

    if (templateId === 'executive') {
      return (
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="font-bold tracking-wide text-[12px] uppercase text-zinc-900">
            {uppercaseTitle}
          </h3>
          <div className="flex-1 h-px bg-zinc-200" />
        </div>
      );
    }

    if (templateId === 'compact') {
      return (
        <div className="border-b border-zinc-400 pb-0.5 mb-1">
          <h3
            className="font-bold tracking-wider text-[11px] uppercase"
            style={{ color: accentColor }}
          >
            {uppercaseTitle}
          </h3>
        </div>
      );
    }

    // Default: Modern Professional
    return (
      <div className="relative pb-1 mb-2 border-b border-zinc-200">
        <h3
          className="font-bold tracking-wide text-[12px] uppercase inline-block"
          style={{ color: accentColor }}
        >
          {title}
        </h3>
        <span
          className="absolute bottom-[-1px] left-0 h-[2px] w-12"
          style={{ backgroundColor: accentColor }}
        />
      </div>
    );
  };

  // Contact Info Line
  const contactItems = [
    personal.email && { icon: MailIcon, text: personal.email, href: `mailto:${personal.email}` },
    personal.phone && { icon: PhoneIcon, text: personal.phone, href: `tel:${personal.phone}` },
    personal.location && { icon: MapPinIcon, text: personal.location },
    personal.website && { icon: GlobeIcon, text: personal.website.replace(/^https?:\/\//, ''), href: personal.website.startsWith('http') ? personal.website : `https://${personal.website}` },
    personal.linkedin && { icon: LinkedInIcon, text: personal.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'in/'), href: personal.linkedin.startsWith('http') ? personal.linkedin : `https://${personal.linkedin}` },
    personal.github && { icon: GitHubIcon, text: personal.github.replace(/^https?:\/\/(www\.)?github\.com\//, 'gh/'), href: personal.github.startsWith('http') ? personal.github : `https://${personal.github}` },
  ].filter(Boolean) as { icon: React.ComponentType<{ size?: number; className?: string }>; text: string; href?: string }[];

  return (
    <div className="resume-print-root w-full flex justify-center">
      <div
        id="resume-preview-sheet"
        className={`bg-white text-zinc-900 shadow-2xl rounded-sm transition-all duration-150 print:shadow-none print:rounded-none ${fontClass} ${textScaleClass}`}
        style={{
          width: paperSize === 'letter' ? '8.5in' : '210mm',
          minHeight: paperSize === 'letter' ? '11in' : '297mm',
          padding: spacing === 'compact' ? '14mm 16mm' : spacing === 'spacious' ? '20mm 22mm' : '16mm 18mm',
          transform: scale !== 1.0 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {/* ========================================================
            HEADER SECTION (Based on selected Template)
           ======================================================== */}

        {/* 1. ATS Classic Header (Centered, Clean, Linear) */}
        {templateId === 'ats' && (
          <header className="text-center pb-3 mb-3 border-b-2 border-zinc-900 resume-section-block">
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 uppercase">
              {personal.fullName || 'Your Full Name'}
            </h1>
            {personal.jobTitle && (
              <p className="text-sm font-semibold text-zinc-700 mt-0.5 tracking-wide">
                {personal.jobTitle}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-[11px] text-zinc-700">
              {contactItems.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-zinc-400">•</span>}
                  {c.href ? (
                    <a href={c.href} className="hover:underline text-zinc-800 font-medium">
                      {c.text}
                    </a>
                  ) : (
                    <span>{c.text}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </header>
        )}

        {/* 2. Modern Professional Header (Left-aligned, Accent branding) */}
        {templateId === 'modern' && (
          <header className="pb-4 mb-3 border-b border-zinc-200 resume-section-block">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1
                  className="text-2xl font-extrabold tracking-tight"
                  style={{ color: accentColor }}
                >
                  {personal.fullName || 'Your Full Name'}
                </h1>
                {personal.jobTitle && (
                  <p className="text-sm font-medium text-zinc-700 mt-0.5">
                    {personal.jobTitle}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-600 sm:text-right">
                {contactItems.map((c, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-zinc-300 hidden sm:inline">•</span>}
                    {c.href ? (
                      <a href={c.href} className="hover:underline text-zinc-700 font-medium flex items-center gap-1">
                        <c.icon size={11} className="shrink-0 text-zinc-500" />
                        {c.text}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1">
                        <c.icon size={11} className="shrink-0 text-zinc-500" />
                        {c.text}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </header>
        )}

        {/* 3. Minimalist Editorial Header (Refined, Generous Breathing Room) */}
        {templateId === 'minimal' && (
          <header className="text-center pb-4 mb-4 resume-section-block">
            <h1 className="text-2xl font-serif tracking-widest text-zinc-900 uppercase">
              {personal.fullName || 'Your Full Name'}
            </h1>
            {personal.jobTitle && (
              <p className="text-xs font-serif text-zinc-600 uppercase tracking-widest mt-1">
                {personal.jobTitle}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2 text-[11px] text-zinc-500">
              {contactItems.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-zinc-300">/</span>}
                  {c.href ? (
                    <a href={c.href} className="hover:underline text-zinc-700">
                      {c.text}
                    </a>
                  ) : (
                    <span>{c.text}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="w-16 h-px bg-zinc-300 mx-auto mt-3" />
          </header>
        )}

        {/* 4. Executive Header (Structured Banner Box) */}
        {templateId === 'executive' && (
          <header
            className="p-4 mb-4 rounded-sm text-white resume-section-block"
            style={{ backgroundColor: accentColor }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  {personal.fullName || 'Your Full Name'}
                </h1>
                {personal.jobTitle && (
                  <p className="text-xs font-medium text-white/90 mt-0.5 uppercase tracking-wider">
                    {personal.jobTitle}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/80 sm:text-right">
                {contactItems.map((c, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-white/40">•</span>}
                    {c.href ? (
                      <a href={c.href} className="hover:underline text-white font-medium">
                        {c.text}
                      </a>
                    ) : (
                      <span>{c.text}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </header>
        )}

        {/* 5. Compact Header (Space Saver) */}
        {templateId === 'compact' && (
          <header className="pb-2 mb-2 border-b-2 border-zinc-800 resume-section-block">
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                {personal.fullName || 'Your Full Name'}
              </h1>
              {personal.jobTitle && (
                <span className="text-xs font-semibold text-zinc-600">
                  {personal.jobTitle}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[10.5px] text-zinc-600">
              {contactItems.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-zinc-300">•</span>}
                  {c.href ? (
                    <a href={c.href} className="hover:underline text-zinc-700">
                      {c.text}
                    </a>
                  ) : (
                    <span>{c.text}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </header>
        )}

        {/* ========================================================
            BODY CONTENT (Ordered dynamically by sectionOrder)
           ======================================================== */}
        <div className={sectionGapClass}>
          {resume.sectionOrder.map((sectionKey: SectionKey) => renderSection(sectionKey))}
        </div>
      </div>
    </div>
  );
}
