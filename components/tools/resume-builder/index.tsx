'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ResumeData,
  SectionKey,
  ResumeTypography,
  PaperSize,
  TEMPLATES_LIST,
  ACCENT_COLORS,
  SECTION_LABELS,
  createEmptyResume,
  createSampleResume,
  loadResumeFromLocalStorage,
  saveResumeToLocalStorage,
  clearResumeFromLocalStorage,
  exportResumeAsJson,
  importResumeFromJson,
  getResumeCompleteness,
  moveSection,
  moveArrayItem,
  validatePersonalDetails,
  ExperienceItem,
  EducationItem,
  ProjectItem,
  SkillCategory,
  CertificationItem,
  CustomSection,
} from '@/lib/resume-builder-utils';
import { ResumePreview } from './resume-preview';
import {
  FileTextIcon,
  PrinterIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  AwardIcon,
  FolderIcon,
  SlidersIcon,
  ShieldIcon,
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SparklesIcon,
  InfoIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function ResumeBuilder() {
  // Initialize resume state from LocalStorage or empty template
  const [resume, setResume] = useState<ResumeData>(() => {
    if (typeof window !== 'undefined') {
      const saved = loadResumeFromLocalStorage();
      if (saved) return saved;
    }
    return createEmptyResume();
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [zoom, setZoom] = useState<number>(0.95);
  const [lastSaved, setLastSaved] = useState<string>('Just now');
  const [isSavedPulse, setIsSavedPulse] = useState<boolean>(false);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [showSampleModal, setShowSampleModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save whenever resume state changes
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      const ok = saveResumeToLocalStorage(resume);
      if (ok) {
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setIsSavedPulse(true);
        setTimeout(() => setIsSavedPulse(false), 2000);
      }
    }, 400);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [resume]);

  // Temporary notifications
  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // Completeness score
  const completeness = getResumeCompleteness(resume);
  const personalErrors = validatePersonalDetails(resume.personal).errors;

  // Print flow
  const handlePrint = () => {
    window.print();
  };

  // Load starter sample resume
  const handleLoadSample = () => {
    const sample = createSampleResume();
    setResume(sample);
    setShowSampleModal(false);
    notify('Loaded starter sample resume successfully!');
  };

  // Clear all data
  const handleClearAll = () => {
    clearResumeFromLocalStorage();
    setResume(createEmptyResume());
    setShowClearModal(false);
    notify('Resume cleared successfully.');
  };

  // Export JSON backup
  const handleExportJson = () => {
    const jsonStr = exportResumeAsJson(resume);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (resume.personal.fullName || 'resume').toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.href = url;
    a.download = `${safeName}-asaptools-backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Exported JSON backup file.');
  };

  // Import JSON backup
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importResumeFromJson(content);
      if (res.success && res.data) {
        setResume(res.data);
        notify('Restored resume from JSON backup!');
      } else {
        notify(res.error || 'Failed to import JSON file.', 'error');
      }
    };
    reader.readAsText(file);

    if (e.target) e.target.value = '';
  };

  // ==========================================
  // State Updaters
  // ==========================================

  const updatePersonal = (field: keyof typeof resume.personal, value: string) => {
    setResume((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  };

  const updateDesign = (field: keyof typeof resume.design, value: unknown) => {
    setResume((prev) => ({
      ...prev,
      design: { ...prev.design, [field]: value },
    }));
  };

  // Experience handlers
  const addExperience = () => {
    const newItem: ExperienceItem = {
      id: `exp-${Date.now()}`,
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      highlights: [''],
    };
    setResume((prev) => ({ ...prev, experience: [...prev.experience, newItem] }));
  };

  const updateExperience = (id: string, field: keyof ExperienceItem, value: unknown) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeExperience = (id: string) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((item) => item.id !== id),
    }));
  };

  const addExperienceHighlight = (expId: string) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((item) =>
        item.id === expId ? { ...item, highlights: [...item.highlights, ''] } : item
      ),
    }));
  };

  const updateExperienceHighlight = (expId: string, index: number, text: string) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((item) => {
        if (item.id !== expId) return item;
        const newHighlights = [...item.highlights];
        newHighlights[index] = text;
        return { ...item, highlights: newHighlights };
      }),
    }));
  };

  const removeExperienceHighlight = (expId: string, index: number) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((item) => {
        if (item.id !== expId) return item;
        return { ...item, highlights: item.highlights.filter((_, i) => i !== index) };
      }),
    }));
  };

  // Education handlers
  const addEducation = () => {
    const newItem: EducationItem = {
      id: `edu-${Date.now()}`,
      institution: '',
      degree: '',
      location: '',
      startDate: '',
      endDate: '',
      gpa: '',
      honors: '',
    };
    setResume((prev) => ({ ...prev, education: [...prev.education, newItem] }));
  };

  const updateEducation = (id: string, field: keyof EducationItem, value: string) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeEducation = (id: string) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.filter((item) => item.id !== id),
    }));
  };

  // Project handlers
  const addProject = () => {
    const newItem: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: '',
      role: '',
      technologies: [],
      link: '',
      startDate: '',
      endDate: '',
      highlights: [''],
    };
    setResume((prev) => ({ ...prev, projects: [...prev.projects, newItem] }));
  };

  const updateProject = (id: string, field: keyof ProjectItem, value: unknown) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeProject = (id: string) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.filter((item) => item.id !== id),
    }));
  };

  const updateProjectHighlight = (projId: string, index: number, text: string) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.map((item) => {
        if (item.id !== projId) return item;
        const newHighlights = [...item.highlights];
        newHighlights[index] = text;
        return { ...item, highlights: newHighlights };
      }),
    }));
  };

  const addProjectHighlight = (projId: string) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.map((item) =>
        item.id === projId ? { ...item, highlights: [...item.highlights, ''] } : item
      ),
    }));
  };

  const removeProjectHighlight = (projId: string, index: number) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.map((item) => {
        if (item.id !== projId) return item;
        return { ...item, highlights: item.highlights.filter((_, i) => i !== index) };
      }),
    }));
  };

  // Skills handlers
  const addSkillCategory = () => {
    const newCategory: SkillCategory = {
      id: `sk-${Date.now()}`,
      name: 'Tools & Technologies',
      skills: [],
    };
    setResume((prev) => ({ ...prev, skills: [...prev.skills, newCategory] }));
  };

  const updateSkillCategoryName = (id: string, name: string) => {
    setResume((prev) => ({
      ...prev,
      skills: prev.skills.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  };

  const removeSkillCategory = (id: string) => {
    setResume((prev) => ({
      ...prev,
      skills: prev.skills.filter((c) => c.id !== id),
    }));
  };

  const addSkillToCategory = (catId: string, skill: string) => {
    const clean = skill.trim();
    if (!clean) return;
    setResume((prev) => ({
      ...prev,
      skills: prev.skills.map((c) => {
        if (c.id !== catId) return c;
        if (c.skills.includes(clean)) return c;
        return { ...c, skills: [...c.skills, clean] };
      }),
    }));
  };

  const removeSkillFromCategory = (catId: string, skillToRemove: string) => {
    setResume((prev) => ({
      ...prev,
      skills: prev.skills.map((c) => {
        if (c.id !== catId) return c;
        return { ...c, skills: c.skills.filter((s) => s !== skillToRemove) };
      }),
    }));
  };

  // Certification handlers
  const addCertification = () => {
    const newItem: CertificationItem = {
      id: `cert-${Date.now()}`,
      name: '',
      issuer: '',
      date: '',
      credentialUrl: '',
    };
    setResume((prev) => ({ ...prev, certifications: [...prev.certifications, newItem] }));
  };

  const updateCertification = (id: string, field: keyof CertificationItem, value: string) => {
    setResume((prev) => ({
      ...prev,
      certifications: prev.certifications.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeCertification = (id: string) => {
    setResume((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((item) => item.id !== id),
    }));
  };

  // Custom sections handlers
  const addCustomSection = () => {
    const newSec: CustomSection = {
      id: `custom-${Date.now()}`,
      heading: 'Leadership & Activities',
      items: [
        {
          id: `item-${Date.now()}`,
          title: 'Organization / Initiative',
          subtitle: 'Role / Position',
          date: '2023 – 2024',
          description: '',
        },
      ],
    };
    setResume((prev) => ({ ...prev, customSections: [...prev.customSections, newSec] }));
  };

  const removeCustomSection = (id: string) => {
    setResume((prev) => ({
      ...prev,
      customSections: prev.customSections.filter((c) => c.id !== id),
    }));
  };

  const updateCustomSectionHeading = (id: string, heading: string) => {
    setResume((prev) => ({
      ...prev,
      customSections: prev.customSections.map((c) => (c.id === id ? { ...c, heading } : c)),
    }));
  };

  const addCustomItem = (secId: string) => {
    setResume((prev) => ({
      ...prev,
      customSections: prev.customSections.map((sec) => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          items: [
            ...sec.items,
            { id: `citem-${Date.now()}`, title: '', subtitle: '', date: '', description: '' },
          ],
        };
      }),
    }));
  };

  const removeCustomItem = (secId: string, itemId: string) => {
    setResume((prev) => ({
      ...prev,
      customSections: prev.customSections.map((sec) => {
        if (sec.id !== secId) return sec;
        return { ...sec, items: sec.items.filter((item) => item.id !== itemId) };
      }),
    }));
  };

  const updateCustomItem = (
    secId: string,
    itemId: string,
    field: 'title' | 'subtitle' | 'date' | 'description',
    val: string
  ) => {
    setResume((prev) => ({
      ...prev,
      customSections: prev.customSections.map((sec) => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          items: sec.items.map((item) => (item.id === itemId ? { ...item, [field]: val } : item)),
        };
      }),
    }));
  };

  // Reorder & visibility
  const handleMoveSection = (key: SectionKey, dir: 'up' | 'down') => {
    setResume((prev) => ({
      ...prev,
      sectionOrder: moveSection(prev.sectionOrder, key, dir),
    }));
  };

  const toggleSectionVisibility = (key: SectionKey) => {
    setResume((prev) => {
      const isHidden = prev.hiddenSections.includes(key);
      return {
        ...prev,
        hiddenSections: isHidden
          ? prev.hiddenSections.filter((k) => k !== key)
          : [...prev.hiddenSections, key],
      };
    });
  };

  // Nav list of guided sections
  const editorNav = [
    { id: 'design', label: 'Template & Design', icon: SlidersIcon },
    { id: 'personal', label: 'Contact Info', icon: FileTextIcon, error: Boolean(personalErrors.fullName || personalErrors.email) },
    { id: 'summary', label: 'Summary', icon: SparklesIcon },
    { id: 'education', label: 'Education', icon: GraduationCapIcon, count: resume.education.length },
    { id: 'experience', label: 'Experience', icon: BriefcaseIcon, count: resume.experience.length },
    { id: 'projects', label: 'Projects', icon: FolderIcon, count: resume.projects.length },
    { id: 'skills', label: 'Skills', icon: CheckCircleIcon, count: resume.skills.reduce((a, c) => a + c.skills.length, 0) },
    { id: 'certifications', label: 'Certifications', icon: AwardIcon, count: resume.certifications.length },
    { id: 'custom', label: 'Custom Sections', icon: PlusIcon, count: resume.customSections.length },
    { id: 'ordering', label: 'Section Order', icon: ArrowUpIcon },
  ];

  return (
    <div className="py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground mb-6 no-print">
          <Link href="/" className="hover:text-foreground transition-colors hover:underline underline-offset-4">
            Home
          </Link>
          <span aria-hidden="true" className="text-zinc-400">/</span>
          <Link href="/#categories" className="hover:text-foreground transition-colors hover:underline underline-offset-4">
            PDF Documents
          </Link>
          <span aria-hidden="true" className="text-zinc-400">/</span>
          <span className="text-foreground font-semibold" aria-current="page">
            CV / Resume Builder
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border no-print">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                <FileTextIcon size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                CV / Resume Builder
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Create professional, ATS-friendly resumes with live preview, multiple templates, and print-ready PDF export. 100% private in your browser with zero server uploads.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="brand" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 py-1">
              <ShieldIcon size={12} />
              100% Local Privacy
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1 text-zinc-600 dark:text-zinc-300">
              <PrinterIcon size={12} className="text-orange-500" />
              Print-Ready Vector PDF
            </Badge>
          </div>
        </div>

        {/* Notification Alert */}
        {notification && (
          <div
            role="status"
            className={`mt-4 p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in transition-all no-print ${
              notification.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {notification.type === 'error' ? <AlertCircleIcon size={16} /> : <CheckCircleIcon size={16} />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Top Action Toolbar */}
        <div className="mt-6 p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          {/* Completeness & Auto-Save Indicator */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSavedPulse ? 'bg-orange-500 animate-ping' : 'bg-emerald-500'}`} />
              <span className="text-xs text-muted-foreground">
                Saved in browser <span className="font-mono text-zinc-600 dark:text-zinc-400">({lastSaved})</span>
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs border-l border-border pl-4">
              <span className="text-muted-foreground">Strength:</span>
              <div className="w-24 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${completeness.score}%` }}
                />
              </div>
              <span className="font-bold text-foreground text-[11px]">{completeness.score}%</span>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSampleModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground border border-border transition-colors"
            >
              <SparklesIcon size={13} className="text-orange-500" />
              Load Sample
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground border border-border transition-colors"
              title="Download backup file to your computer"
            >
              <DownloadIcon size={13} />
              Backup JSON
            </button>

            <button
              type="button"
              onClick={() => jsonFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground border border-border transition-colors"
              title="Restore resume from a saved JSON backup"
            >
              <UploadIcon size={13} />
              Import
            </button>
            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
            >
              <TrashIcon size={13} />
              Reset
            </button>

            {/* Primary Print / PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <PrinterIcon size={15} />
              Export PDF / Print
            </button>
          </div>
        </div>

        {/* Mobile View Switcher (Visible on < lg screens) */}
        <div className="lg:hidden mt-4 flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-border no-print">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'editor'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileTextIcon size={14} />
            Guided Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'preview'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <EyeIcon size={14} />
            Live Preview Sheet
          </button>
        </div>

        {/* Main Workspace (Split View) */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ==========================================================
              LEFT COLUMN: GUIDED RESUME EDITOR (lg:col-span-6 or 7)
             ========================================================== */}
          <div className={`lg:col-span-6 xl:col-span-6 space-y-6 ${activeTab === 'preview' ? 'hidden lg:block' : ''} no-print`}>
            {/* Guided Section Pills / Tabs */}
            <div className="p-2 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {editorNav.map((nav) => {
                const Icon = nav.icon;
                const isActive = activeSection === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => setActiveSection(nav.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={13} className={isActive ? 'text-white' : 'text-zinc-500'} />
                    <span>{nav.label}</span>
                    {typeof nav.count === 'number' && nav.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                        {nav.count}
                      </span>
                    )}
                    {nav.error && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ========================================================
                SECTION 1: TEMPLATE & DESIGN CONTROLS
               ======================================================== */}
            {activeSection === 'design' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Choose Resume Template</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select a layout designed for your career stage. All templates export cleanly to ATS systems.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TEMPLATES_LIST.map((tpl) => {
                    const isSelected = resume.design.templateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => updateDesign('templateId', tpl.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500/40 shadow-xs'
                            : 'border-border hover:border-zinc-300 dark:hover:border-zinc-700 bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-foreground">{tpl.name}</span>
                          {tpl.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                              {tpl.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">{tpl.description}</p>
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-2">
                          Ideal for: {tpl.idealFor}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Accent Color */}
                <div className="pt-4 border-t border-border space-y-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Accent Color
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => updateDesign('accentColor', col.hex)}
                        title={col.name}
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                          resume.design.accentColor === col.hex
                            ? 'ring-2 ring-orange-500 scale-110 border-transparent shadow-xs'
                            : 'border-border hover:scale-105'
                        }`}
                        style={{ backgroundColor: col.hex }}
                      >
                        {resume.design.accentColor === col.hex && (
                          <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                        )}
                      </button>
                    ))}
                    {/* Custom Color Input */}
                    <label
                      title="Custom color"
                      className="w-8 h-8 rounded-xl border border-border cursor-pointer flex items-center justify-center relative overflow-hidden"
                      style={{ backgroundColor: resume.design.accentColor }}
                    >
                      <input
                        type="color"
                        value={resume.design.accentColor}
                        onChange={(e) => updateDesign('accentColor', e.target.value)}
                        className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>

                {/* Typography & Spacing */}
                <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Typography
                    </label>
                    <select
                      value={resume.design.typography}
                      onChange={(e) => updateDesign('typography', e.target.value as ResumeTypography)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                    >
                      <option value="sans">Clean Modern (Sans-Serif)</option>
                      <option value="serif">Editorial Classic (Serif)</option>
                      <option value="mono">Tech Minimal (Monospace)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Paper Size
                    </label>
                    <select
                      value={resume.design.paperSize}
                      onChange={(e) => updateDesign('paperSize', e.target.value as PaperSize)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                    >
                      <option value="a4">A4 (Standard International)</option>
                      <option value="letter">US Letter (North America)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Layout Density
                    </label>
                    <select
                      value={resume.design.spacing}
                      onChange={(e) => updateDesign('spacing', e.target.value as 'compact' | 'normal' | 'spacious')}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                    >
                      <option value="compact">Compact (Fit More on 1 Page)</option>
                      <option value="normal">Normal (Balanced)</option>
                      <option value="spacious">Spacious (Generous)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 2: CONTACT & PERSONAL INFORMATION
               ======================================================== */}
            {activeSection === 'personal' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Contact & Personal Information</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your contact details will appear prominently at the top of your resume header.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Full Name <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Morgan"
                      value={resume.personal.fullName}
                      onChange={(e) => updatePersonal('fullName', e.target.value)}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-card text-foreground outline-none focus:ring-2 focus:ring-orange-500 ${
                        personalErrors.fullName ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {personalErrors.fullName && (
                      <p className="text-[11px] text-red-500 mt-1">{personalErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Job / Target Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer / Computer Science Student"
                      value={resume.personal.jobTitle}
                      onChange={(e) => updatePersonal('jobTitle', e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Email Address <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. alex.morgan@example.com"
                      value={resume.personal.email}
                      onChange={(e) => updatePersonal('email', e.target.value)}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-card text-foreground outline-none focus:ring-2 focus:ring-orange-500 ${
                        personalErrors.email ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {personalErrors.email && (
                      <p className="text-[11px] text-red-500 mt-1">{personalErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 234-5678"
                      value={resume.personal.phone}
                      onChange={(e) => updatePersonal('phone', e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Location / City, Country
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Seattle, WA or Bengaluru, India"
                      value={resume.personal.location}
                      onChange={(e) => updatePersonal('location', e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Online Profiles & Portfolios
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Portfolio / Website</label>
                      <input
                        type="text"
                        placeholder="alexmorgan.dev"
                        value={resume.personal.website || ''}
                        onChange={(e) => updatePersonal('website', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">LinkedIn Profile</label>
                      <input
                        type="text"
                        placeholder="linkedin.com/in/username"
                        value={resume.personal.linkedin || ''}
                        onChange={(e) => updatePersonal('linkedin', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">GitHub / Code</label>
                      <input
                        type="text"
                        placeholder="github.com/username"
                        value={resume.personal.github || ''}
                        onChange={(e) => updatePersonal('github', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 3: PROFESSIONAL SUMMARY
               ======================================================== */}
            {activeSection === 'summary' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Professional Summary</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      A concise 2-4 sentence overview highlighting your focus, key strengths, and career goals.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {resume.summary.length} characters
                  </span>
                </div>

                <textarea
                  rows={6}
                  placeholder="e.g. Computer Science graduate with strong foundations in distributed systems, web architectures, and algorithms. Experienced in building responsive full-stack applications with TypeScript and Go..."
                  value={resume.summary}
                  onChange={(e) => setResume((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full text-xs p-3.5 rounded-2xl border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed"
                />

                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-border flex items-start gap-2.5 text-xs text-muted-foreground">
                  <InfoIcon size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Tip:</strong> Tailor your summary to the specific role you are targeting. Include relevant keywords from the job description to optimize for ATS scanners.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 4: EDUCATION
               ======================================================== */}
            {activeSection === 'education' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Education</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add degrees, colleges, universities, or high school certifications.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                  >
                    <PlusIcon size={13} />
                    Add Degree
                  </button>
                </div>

                {resume.education.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl space-y-2">
                    <GraduationCapIcon size={28} className="mx-auto text-zinc-400" />
                    <p className="text-xs text-muted-foreground">No education items added yet.</p>
                    <button
                      type="button"
                      onClick={addEducation}
                      className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                    >
                      + Add University or College
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resume.education.map((edu, idx) => (
                      <div key={edu.id} className="p-4 rounded-2xl border border-border bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">#{idx + 1} Degree</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setResume((prev) => ({ ...prev, education: moveArrayItem(prev.education, idx, 'up') }))}
                              disabled={idx === 0}
                              className="p-1 rounded-lg text-zinc-500 hover:text-foreground disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUpIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setResume((prev) => ({ ...prev, education: moveArrayItem(prev.education, idx, 'down') }))}
                              disabled={idx === resume.education.length - 1}
                              className="p-1 rounded-lg text-zinc-500 hover:text-foreground disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDownIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEducation(edu.id)}
                              className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 ml-1"
                              title="Delete"
                            >
                              <TrashIcon size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">University / Institution</label>
                            <input
                              type="text"
                              placeholder="e.g. University of Washington"
                              value={edu.institution}
                              onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Degree & Major</label>
                            <input
                              type="text"
                              placeholder="e.g. B.S. in Computer Science"
                              value={edu.degree}
                              onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Start Date</label>
                            <input
                              type="text"
                              placeholder="e.g. Sep 2020"
                              value={edu.startDate}
                              onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Graduation Date</label>
                            <input
                              type="text"
                              placeholder="e.g. Jun 2024 or Expected May 2025"
                              value={edu.endDate}
                              onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">GPA (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. 3.8 / 4.0"
                              value={edu.gpa || ''}
                              onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Honors / Minors (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. Dean's List, Minor in Mathematics"
                              value={edu.honors || ''}
                              onChange={(e) => updateEducation(edu.id, 'honors', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                SECTION 5: WORK EXPERIENCE
               ======================================================== */}
            {activeSection === 'experience' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Work Experience</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add full-time roles, internships, co-ops, or freelance experience.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addExperience}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                  >
                    <PlusIcon size={13} />
                    Add Job
                  </button>
                </div>

                {resume.experience.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl space-y-2">
                    <BriefcaseIcon size={28} className="mx-auto text-zinc-400" />
                    <p className="text-xs text-muted-foreground">No experience items added yet.</p>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                    >
                      + Add Work Experience / Internship
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {resume.experience.map((exp, idx) => (
                      <div key={exp.id} className="p-4 rounded-2xl border border-border bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">#{idx + 1} Role</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setResume((prev) => ({ ...prev, experience: moveArrayItem(prev.experience, idx, 'up') }))}
                              disabled={idx === 0}
                              className="p-1 rounded-lg text-zinc-500 hover:text-foreground disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUpIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setResume((prev) => ({ ...prev, experience: moveArrayItem(prev.experience, idx, 'down') }))}
                              disabled={idx === resume.experience.length - 1}
                              className="p-1 rounded-lg text-zinc-500 hover:text-foreground disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDownIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeExperience(exp.id)}
                              className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 ml-1"
                              title="Delete"
                            >
                              <TrashIcon size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Company / Organization</label>
                            <input
                              type="text"
                              placeholder="e.g. Acme Inc."
                              value={exp.company}
                              onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Job Title</label>
                            <input
                              type="text"
                              placeholder="e.g. Software Engineering Intern"
                              value={exp.position}
                              onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Start Date</label>
                            <input
                              type="text"
                              placeholder="e.g. Jun 2023"
                              value={exp.startDate}
                              onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-medium text-foreground">End Date</label>
                              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={exp.current}
                                  onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                                />
                                Currently work here
                              </label>
                            </div>
                            <input
                              type="text"
                              disabled={exp.current}
                              placeholder={exp.current ? 'Present' : 'e.g. Sep 2023'}
                              value={exp.current ? 'Present' : exp.endDate}
                              onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Bullet Highlights */}
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-foreground">Key Accomplishments & Bullet Points</label>
                            <button
                              type="button"
                              onClick={() => addExperienceHighlight(exp.id)}
                              className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                            >
                              + Add Bullet
                            </button>
                          </div>

                          {exp.highlights.map((bullet, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2">
                              <span className="text-zinc-400 text-xs">•</span>
                              <input
                                type="text"
                                placeholder="e.g. Built a real-time ingestion pipeline processing 1.5M events daily using Node.js"
                                value={bullet}
                                onChange={(e) => updateExperienceHighlight(exp.id, bIdx, e.target.value)}
                                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => removeExperienceHighlight(exp.id, bIdx)}
                                className="text-zinc-400 hover:text-red-500 p-1"
                                title="Remove bullet"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                SECTION 6: KEY PROJECTS
               ======================================================== */}
            {activeSection === 'projects' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Key Projects</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Showcase applications, open-source work, capstones, and engineering demos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addProject}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                  >
                    <PlusIcon size={13} />
                    Add Project
                  </button>
                </div>

                {resume.projects.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl space-y-2">
                    <FolderIcon size={28} className="mx-auto text-zinc-400" />
                    <p className="text-xs text-muted-foreground">No projects added yet.</p>
                    <button
                      type="button"
                      onClick={addProject}
                      className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                    >
                      + Add Key Project
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {resume.projects.map((proj, idx) => (
                      <div key={proj.id} className="p-4 rounded-2xl border border-border bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">#{idx + 1} Project</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setResume((prev) => ({ ...prev, projects: moveArrayItem(prev.projects, idx, 'up') }))}
                              disabled={idx === 0}
                              className="p-1 rounded-lg text-zinc-500 hover:text-foreground disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUpIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setResume((prev) => ({ ...prev, projects: moveArrayItem(prev.projects, idx, 'down') }))}
                              disabled={idx === resume.projects.length - 1}
                              className="p-1 rounded-lg text-zinc-500 hover:text-foreground disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDownIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProject(proj.id)}
                              className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 ml-1"
                              title="Delete"
                            >
                              <TrashIcon size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Project Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Distributed Key-Value Store"
                              value={proj.name}
                              onChange={(e) => updateProject(proj.id, 'name', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Role (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. Lead Developer / Creator"
                              value={proj.role || ''}
                              onChange={(e) => updateProject(proj.id, 'role', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Demo / Code Link (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. github.com/user/project"
                              value={proj.link || ''}
                              onChange={(e) => updateProject(proj.id, 'link', e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-foreground mb-1">Tech Stack (comma separated)</label>
                            <input
                              type="text"
                              placeholder="e.g. Go, Raft, Docker, gRPC"
                              value={proj.technologies.join(', ')}
                              onChange={(e) =>
                                updateProject(
                                  proj.id,
                                  'technologies',
                                  e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                                )
                              }
                              className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                            />
                          </div>
                        </div>

                        {/* Bullet Highlights */}
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-foreground">Project Highlights & Impact</label>
                            <button
                              type="button"
                              onClick={() => addProjectHighlight(proj.id)}
                              className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                            >
                              + Add Bullet
                            </button>
                          </div>

                          {proj.highlights.map((bullet, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2">
                              <span className="text-zinc-400 text-xs">•</span>
                              <input
                                type="text"
                                placeholder="e.g. Implemented Raft consensus from scratch supporting leader election"
                                value={bullet}
                                onChange={(e) => updateProjectHighlight(proj.id, bIdx, e.target.value)}
                                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => removeProjectHighlight(proj.id, bIdx)}
                                className="text-zinc-400 hover:text-red-500 p-1"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                SECTION 7: SKILLS
               ======================================================== */}
            {activeSection === 'skills' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Technical & Professional Skills</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Group your skills logically (e.g. Languages, Frameworks, Developer Tools).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addSkillCategory}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                  >
                    <PlusIcon size={13} />
                    Add Category
                  </button>
                </div>

                <div className="space-y-4">
                  {resume.skills.map((cat) => (
                    <div key={cat.id} className="p-4 rounded-2xl border border-border bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={cat.name}
                          onChange={(e) => updateSkillCategoryName(cat.id, e.target.value)}
                          placeholder="e.g. Programming Languages"
                          className="font-bold text-xs text-foreground bg-transparent border-b border-dashed border-border px-1 py-0.5 outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeSkillCategory(cat.id)}
                          className="text-xs text-red-500 hover:bg-red-500/10 p-1 rounded-lg"
                        >
                          <TrashIcon size={12} />
                        </button>
                      </div>

                      {/* Tag Input */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {cat.skills.map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-card border border-border text-foreground font-medium"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => removeSkillFromCategory(cat.id, skill)}
                                className="text-zinc-400 hover:text-red-500 ml-0.5"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Type a skill and press Enter..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSkillToCategory(cat.id, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 8: CERTIFICATIONS
               ======================================================== */}
            {activeSection === 'certifications' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Certifications & Licenses</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Include industry credentials, cloud certifications, or specialized licenses.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addCertification}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                  >
                    <PlusIcon size={13} />
                    Add Certification
                  </button>
                </div>

                {resume.certifications.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl space-y-2">
                    <AwardIcon size={28} className="mx-auto text-zinc-400" />
                    <p className="text-xs text-muted-foreground">No certifications added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resume.certifications.map((cert) => (
                      <div key={cert.id} className="p-4 rounded-2xl border border-border bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            placeholder="e.g. AWS Certified Solutions Architect"
                            value={cert.name}
                            onChange={(e) => updateCertification(cert.id, 'name', e.target.value)}
                            className="flex-1 font-bold text-xs text-foreground bg-transparent border-b border-dashed border-border px-1 py-0.5 outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeCertification(cert.id)}
                            className="text-xs text-red-500 hover:bg-red-500/10 p-1 rounded-lg ml-2"
                          >
                            <TrashIcon size={12} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] text-muted-foreground mb-1">Issuing Authority</label>
                            <input
                              type="text"
                              placeholder="e.g. Amazon Web Services"
                              value={cert.issuer}
                              onChange={(e) => updateCertification(cert.id, 'issuer', e.target.value)}
                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-muted-foreground mb-1">Date</label>
                            <input
                              type="text"
                              placeholder="e.g. Nov 2023"
                              value={cert.date}
                              onChange={(e) => updateCertification(cert.id, 'date', e.target.value)}
                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-muted-foreground mb-1">Verification URL (Optional)</label>
                            <input
                              type="text"
                              placeholder="https://..."
                              value={cert.credentialUrl || ''}
                              onChange={(e) => updateCertification(cert.id, 'credentialUrl', e.target.value)}
                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                SECTION 9: CUSTOM SECTIONS
               ======================================================== */}
            {activeSection === 'custom' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Custom / Optional Sections</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add custom categories such as Publications, Leadership, Volunteer, or Honors.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomSection}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                  >
                    <PlusIcon size={13} />
                    Add Section
                  </button>
                </div>

                {resume.customSections.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl space-y-2">
                    <p className="text-xs text-muted-foreground">No custom sections added.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {resume.customSections.map((sec) => (
                      <div key={sec.id} className="p-4 rounded-2xl border border-border bg-zinc-50/50 dark:bg-zinc-900/40 space-y-4">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={sec.heading}
                            onChange={(e) => updateCustomSectionHeading(sec.id, e.target.value)}
                            placeholder="Section Title"
                            className="font-bold text-xs text-foreground bg-transparent border-b border-dashed border-border px-1 py-0.5 outline-none focus:border-orange-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addCustomItem(sec.id)}
                              className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                            >
                              + Add Item
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCustomSection(sec.id)}
                              className="text-xs text-red-500 hover:bg-red-500/10 p-1 rounded-lg"
                            >
                              <TrashIcon size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {sec.items.map((item) => (
                            <div key={item.id} className="p-3 rounded-xl border border-border bg-card space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  placeholder="Item Title (e.g. IEEE Paper on Cloud Systems)"
                                  value={item.title}
                                  onChange={(e) => updateCustomItem(sec.id, item.id, 'title', e.target.value)}
                                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeCustomItem(sec.id, item.id)}
                                  className="text-zinc-400 hover:text-red-500 p-1"
                                >
                                  ×
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Subtitle / Role (Optional)"
                                  value={item.subtitle || ''}
                                  onChange={(e) => updateCustomItem(sec.id, item.id, 'subtitle', e.target.value)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground"
                                />
                                <input
                                  type="text"
                                  placeholder="Date / Year"
                                  value={item.date || ''}
                                  onChange={(e) => updateCustomItem(sec.id, item.id, 'date', e.target.value)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground"
                                />
                              </div>

                              <textarea
                                rows={2}
                                placeholder="Description or bullet notes..."
                                value={item.description || ''}
                                onChange={(e) => updateCustomItem(sec.id, item.id, 'description', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-lg border border-border bg-card text-foreground"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                SECTION 10: SECTION ORDER & VISIBILITY
               ======================================================== */}
            {activeSection === 'ordering' && (
              <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Section Order & Visibility</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reorder sections (e.g. put Education before Experience for freshers), or hide sections without deleting data.
                  </p>
                </div>

                <div className="space-y-2">
                  {resume.sectionOrder.map((key, idx) => {
                    const isHidden = resume.hiddenSections.includes(key);
                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
                          isHidden
                            ? 'border-border/60 bg-zinc-100/50 dark:bg-zinc-900/20 opacity-60'
                            : 'border-border bg-card shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {SECTION_LABELS[key] || key}
                          </span>
                          {isHidden && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                              Hidden
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleSectionVisibility(key)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title={isHidden ? 'Show section' : 'Hide section'}
                          >
                            <EyeIcon size={14} className={isHidden ? 'text-zinc-400' : 'text-orange-500'} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSection(key, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUpIcon size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSection(key, 'down')}
                            disabled={idx === resume.sectionOrder.length - 1}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDownIcon size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ==========================================================
              RIGHT COLUMN: LIVE RESUME SHEET PREVIEW (lg:col-span-6)
             ========================================================== */}
          <div className={`lg:col-span-6 xl:col-span-6 ${activeTab === 'editor' ? 'hidden lg:block' : ''} sticky top-6`}>
            {/* Live Preview Controls Header */}
            <div className="p-3 mb-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-foreground">Live Sheet Preview</span>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  • {resume.design.paperSize.toUpperCase()}
                </span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
                  className="w-7 h-7 rounded-lg border border-border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-foreground flex items-center justify-center"
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="text-xs font-mono text-muted-foreground w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.2, z + 0.1))}
                  className="w-7 h-7 rounded-lg border border-border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-foreground flex items-center justify-center"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1.0)}
                  className="text-[11px] px-2 py-1 rounded-lg border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground font-medium ml-1"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Scrollable Container with Sheet */}
            <div className="max-h-[820px] overflow-auto rounded-3xl border border-border bg-zinc-100/80 dark:bg-zinc-950/80 p-2 sm:p-4 shadow-inner flex justify-center">
              <ResumePreview
                resume={resume}
                scale={zoom}
                interactive={true}
                onSectionClick={(sec) => {
                  setActiveSection(sec);
                  if (activeTab === 'preview') setActiveTab('editor');
                }}
              />
            </div>
          </div>
        </div>

        {/* ========================================================
            EDUCATIONAL & SEO CONTENT
           ======================================================== */}
        <div className="mt-20 pt-12 border-t border-border space-y-16 no-print">
          {/* Why ASAPTools Resume Builder */}
          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Engineered for High ATS Parsing Rates & Privacy
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Built to solve the frustrations of subscription traps, forced sign-ups, and distorted PDF exports.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <ShieldIcon size={16} />
                </div>
                <h3 className="font-semibold text-sm text-foreground">100% Client-Side Privacy</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your career history, contact information, and personal notes remain solely in your browser. No server storage, no database leaks, and zero telemetry.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20">
                  <CheckCircleIcon size={16} />
                </div>
                <h3 className="font-semibold text-sm text-foreground">ATS Classic Student Template</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Engineered with single-column linear hierarchy and standardized headings that pass seamlessly through Workday, Lever, Greenhouse, and Taleo.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <PrinterIcon size={16} />
                </div>
                <h3 className="font-semibold text-sm text-foreground">Selectable Vector PDF Export</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Export true vector text PDFs using your browser&apos;s native print engine. No rasterized image degradation, selectable text, and working hyperlinks.
                </p>
              </div>
            </div>
          </section>

          {/* Frequently Asked Questions */}
          <section className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center">
              Frequently Asked Questions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
                <h3 className="font-semibold text-sm text-foreground">
                  How do I download my resume as a PDF?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click the <strong>&quot;Export PDF / Print&quot;</strong> button at the top. In your browser&apos;s print dialogue, set the Destination to <em>&quot;Save as PDF&quot;</em>, select A4 or Letter, and click Save. This creates a crisp vector PDF.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
                <h3 className="font-semibold text-sm text-foreground">
                  Is there any subscription or watermark?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No. Unlike typical commercial resume tools, ASAPTools has no hidden fees, subscriptions, or watermarks. Every template and feature is completely free and unrestricted.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
                <h3 className="font-semibold text-sm text-foreground">
                  Can I continue editing later?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Yes! Your draft automatically auto-saves to your local browser storage. You can also click <strong>&quot;Backup JSON&quot;</strong> to save a backup file and import it anytime on any computer.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
                <h3 className="font-semibold text-sm text-foreground">
                  Why is the ATS Classic template recommended for students?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Recruiters and university campus portals use automated parsers that struggle with multi-column graphics or custom icons. The ATS Classic template guarantees 100% readable text flow.
                </p>
              </div>
            </div>
          </section>

          {/* Related Tools */}
          <section className="p-6 rounded-3xl border border-border bg-zinc-50/50 dark:bg-zinc-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-foreground">Need to optimize documents for job applications?</h3>
              <p className="text-xs text-muted-foreground">Explore our document compression and conversion tools.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/tools/pdf-compressor"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground border border-border transition-colors"
              >
                PDF Compressor →
              </Link>
              <Link
                href="/tools/word-to-pdf"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground border border-border transition-colors"
              >
                Word to PDF →
              </Link>
              <Link
                href="/tools/pdf-tools"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground border border-border transition-colors"
              >
                PDF Merge & Split →
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation Modal: Load Sample */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full bg-card p-6 rounded-3xl border border-border shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20">
                <SparklesIcon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Load Starter Sample Resume?</h3>
                <p className="text-xs text-muted-foreground">This will replace your current edits with a clean CS graduate example.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
              >
                Yes, Load Sample
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear All */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full bg-card p-6 rounded-3xl border border-border shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
                <TrashIcon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Clear Resume Draft?</h3>
                <p className="text-xs text-muted-foreground">Are you sure you want to clear your saved resume? This cannot be undone unless you have a JSON backup.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
