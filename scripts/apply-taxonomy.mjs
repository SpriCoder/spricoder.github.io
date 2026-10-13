import fs from 'node:fs';
import matter from 'gray-matter';

const assignments = JSON.parse(fs.readFileSync('taxonomy/course-assignments.json', 'utf8'));
const tags = JSON.parse(fs.readFileSync('taxonomy/post-tags.json', 'utf8'));
const managed = new Set(['tags', 'course', 'course_group', 'course_order', 'content_type']);
let changed = 0;
for (const [id, metadata] of Object.entries(tags)) {
  const file = `content/posts/${id}`;
  const original = fs.readFileSync(file, 'utf8');
  const match = original.match(/^(\uFEFF?---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))([\s\S]*)$/);
  if (!match) throw new Error(`Missing YAML frontmatter: ${id}`);
  const eol = match[1].includes('\r\n') ? '\r\n' : '\n';
  const lines = match[2].split(/\r?\n/);
  const kept = [];
  let skip = false;
  for (const line of lines) {
    const field = line.match(/^([A-Za-z_][\w-]*):/);
    if (field) skip = managed.has(field[1]);
    if (!skip) kept.push(line);
  }
  const added = [`tags: ${JSON.stringify(metadata.tags)}`, `content_type: ${metadata.contentType}`];
  if (assignments[id]) {
    for (const [key, value] of Object.entries(assignments[id])) added.push(`${key}: ${value}`);
  }
  const replacement = match[1] + [...kept, ...added].join(eol) + match[3] + match[4];
  const before = matter(original); const after = matter(replacement);
  if (before.content !== after.content) throw new Error(`Body unexpectedly changed: ${id}`);
  const protectedFields = data => Object.fromEntries(Object.entries(data).filter(([key]) => !managed.has(key)));
  if (JSON.stringify(protectedFields(before.data)) !== JSON.stringify(protectedFields(after.data))) throw new Error(`Unrelated metadata changed: ${id}`);
  if (JSON.stringify(after.data.tags) !== JSON.stringify(metadata.tags)) throw new Error(`Tags did not parse correctly: ${id}`);
  if (replacement !== original) { fs.writeFileSync(file, replacement); changed++; }
}
console.log(`Updated tags and course metadata in ${changed} articles; original bodies and other fields preserved.`);
