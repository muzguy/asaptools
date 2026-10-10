import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyResume,
  createSampleResume,
  validatePersonalDetails,
  validateResume,
  getResumeCompleteness,
  moveSection,
  moveArrayItem,
  exportResumeAsJson,
  importResumeFromJson,
  TEMPLATES_LIST,
  ACCENT_COLORS,
  DEFAULT_SECTION_ORDER,
} from '../lib/resume-builder-utils.ts';
import { TOOLS_REGISTRY, POPULAR_TOOL_IDS } from '../lib/tools-registry.ts';

describe('Resume Builder - Default & Sample Resume Structures', () => {
  test('creates an empty resume with valid default structure', () => {
    const resume = createEmptyResume();
    assert.equal(typeof resume.personal, 'object');
    assert.equal(resume.personal.fullName, '');
    assert.equal(resume.personal.email, '');
    assert.equal(resume.summary, '');
    assert.deepEqual(resume.experience, []);
    assert.deepEqual(resume.education, []);
    assert.deepEqual(resume.projects, []);
    assert.ok(Array.isArray(resume.skills));
    assert.equal(resume.design.templateId, 'ats');
    assert.deepEqual(resume.sectionOrder, DEFAULT_SECTION_ORDER);
  });

  test('creates an honest, realistic sample resume for testing', () => {
    const sample = createSampleResume();
    assert.equal(sample.personal.fullName, 'Alex Morgan');
    assert.ok(sample.personal.email.includes('@'));
    assert.ok(sample.summary.length > 50);
    assert.ok(sample.education.length >= 1);
    assert.ok(sample.experience.length >= 1);
    assert.ok(sample.projects.length >= 1);
    assert.ok(sample.skills.length >= 2);
    assert.ok(sample.certifications.length >= 1);
  });
});

describe('Resume Builder - Personal Details & Resume Validation', () => {
  test('flags missing full name as error', () => {
    const result = validatePersonalDetails({ fullName: '', email: 'alex@example.com' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.fullName);
  });

  test('flags malformed email syntax as error', () => {
    const result = validatePersonalDetails({ fullName: 'Alex Morgan', email: 'not-an-email' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.email);
  });

  test('passes validation with clean name and valid email', () => {
    const result = validatePersonalDetails({
      fullName: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1 555-0199',
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, {});
  });

  test('validates overall resume and emits warnings when contact info is sparse', () => {
    const emptyResume = createEmptyResume();
    const result = validateResume(emptyResume);
    assert.equal(result.valid, false); // missing name
    assert.ok(result.warnings.length > 0);
  });
});

describe('Resume Builder - Completeness Score Calculation', () => {
  test('returns 0% for blank resume and suggests adding details', () => {
    const empty = createEmptyResume();
    const res = getResumeCompleteness(empty);
    assert.equal(res.score, 0);
    assert.ok(res.tips.length >= 5);
  });

  test('returns 100% score for populated sample resume', () => {
    const sample = createSampleResume();
    const res = getResumeCompleteness(sample);
    assert.equal(res.score, 100);
    assert.equal(res.tips.length, 0);
  });

  test('calculates partial completeness accurately', () => {
    const partial = createEmptyResume();
    partial.personal.fullName = 'Jane Doe';
    partial.personal.jobTitle = 'Frontend Engineer';
    partial.personal.email = 'jane@example.com';
    partial.personal.phone = '123-456-7890';
    const res = getResumeCompleteness(partial);
    assert.ok(res.score > 20 && res.score < 80);
  });
});

describe('Resume Builder - Section & Item Reordering Logic', () => {
  test('moves section up in the order array', () => {
    const initial = ['summary', 'education', 'experience'];
    const updated = moveSection(initial, 'experience', 'up');
    assert.deepEqual(updated, ['summary', 'experience', 'education']);
  });

  test('moves section down in the order array', () => {
    const initial = ['summary', 'education', 'experience'];
    const updated = moveSection(initial, 'summary', 'down');
    assert.deepEqual(updated, ['education', 'summary', 'experience']);
  });

  test('preserves order when moving beyond boundaries', () => {
    const initial = ['summary', 'education', 'experience'];
    const atTop = moveSection(initial, 'summary', 'up');
    assert.deepEqual(atTop, initial);

    const atBottom = moveSection(initial, 'experience', 'down');
    assert.deepEqual(atBottom, initial);
  });

  test('reorders generic array items cleanly', () => {
    const items = ['item1', 'item2', 'item3'];
    const moved = moveArrayItem(items, 1, 'up');
    assert.deepEqual(moved, ['item2', 'item1', 'item3']);
  });
});

describe('Resume Builder - JSON Backup & Restore Serialization', () => {
  test('exports resume to valid JSON string', () => {
    const sample = createSampleResume();
    const jsonStr = exportResumeAsJson(sample);
    assert.equal(typeof jsonStr, 'string');
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.personal.fullName, 'Alex Morgan');
  });

  test('imports and validates well-formed resume JSON', () => {
    const sample = createSampleResume();
    const jsonStr = exportResumeAsJson(sample);
    const result = importResumeFromJson(jsonStr);
    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data?.personal.fullName, 'Alex Morgan');
    assert.equal(result.data?.design.templateId, 'ats');
  });

  test('rejects corrupt or malformed JSON syntax', () => {
    const result = importResumeFromJson('{ corrupt json string ...');
    assert.equal(result.success, false);
    assert.match(result.error || '', /Invalid JSON syntax/i);
  });

  test('rejects JSON missing required personal information', () => {
    const result = importResumeFromJson(JSON.stringify({ someUnrelatedKey: 123 }));
    assert.equal(result.success, false);
    assert.match(result.error || '', /missing required resume data/i);
  });
});

describe('Resume Builder - Templates & Styling Configurations', () => {
  test('includes exactly 5 professional templates', () => {
    assert.equal(TEMPLATES_LIST.length, 5);
    const ids = TEMPLATES_LIST.map((t) => t.id);
    assert.ok(ids.includes('ats'));
    assert.ok(ids.includes('modern'));
    assert.ok(ids.includes('minimal'));
    assert.ok(ids.includes('executive'));
    assert.ok(ids.includes('compact'));
  });

  test('provides ATS Classic template with proper metadata', () => {
    const atsTemplate = TEMPLATES_LIST.find((t) => t.id === 'ats');
    assert.ok(atsTemplate);
    assert.match(atsTemplate?.name || '', /ATS Classic/i);
    assert.match(atsTemplate?.idealFor || '', /student|fresher|grad/i);
  });

  test('provides multiple accent color options', () => {
    assert.ok(ACCENT_COLORS.length >= 5);
    const hexes = ACCENT_COLORS.map((c) => c.hex);
    assert.ok(hexes.includes('#ea580c')); // ASAP Orange
    assert.ok(hexes.includes('#0f172a')); // Slate
  });
});

describe('Resume Builder - Tools Registry Integration', () => {
  test('is registered in TOOLS_REGISTRY with correct metadata', () => {
    const tool = TOOLS_REGISTRY.find((t) => t.id === 'resume-builder');
    assert.ok(tool, 'resume-builder must be registered in TOOLS_REGISTRY');
    assert.equal(tool.name, 'CV / Resume Builder');
    assert.equal(tool.slug, '/tools/resume-builder');
    assert.equal(tool.category, 'pdf');
    assert.equal(tool.status, 'available');
    assert.equal(tool.icon, 'fileText');
    assert.ok(tool.keywords.includes('resume builder'));
    assert.ok(tool.keywords.includes('cv builder'));
    assert.ok(tool.keywords.includes('ats resume'));
  });

  test('is included in POPULAR_TOOL_IDS', () => {
    assert.ok(
      POPULAR_TOOL_IDS.includes('resume-builder'),
      'resume-builder must be included in POPULAR_TOOL_IDS'
    );
  });
});
