import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';

const posts = JSON.parse(fs.readFileSync('src/data/posts.json', 'utf8'));
const baseline = JSON.parse(fs.readFileSync('migration/baseline.json', 'utf8'));
const courses = JSON.parse(fs.readFileSync('src/data/courses.json', 'utf8'));
const byCourse = new Map(courses.map(course => [course.slug, course]));
const byId = new Map(posts.map(post => [post.id, post]));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const allowedMetadata = new Set(['tags', 'course', 'course_group', 'course_order', 'content_type']);
const protect = data => Object.fromEntries(Object.entries(data).filter(([key]) => !allowedMetadata.has(key)));

check(posts.length === baseline.length, 'Published article count changed');
for (const original of baseline) {
  const post = byId.get(original.id);
  check(Boolean(post), `Missing article: ${original.id}`);
  if (!post) continue;
  const current = matter(fs.readFileSync(post.source, 'utf8'));
  const previous = matter(fs.readFileSync(path.join('..', 'SpriCoder-Blog/source', original.source), 'utf8'));
  check(current.content === previous.content, `Body changed: ${post.id}`);
  check(JSON.stringify(protect(current.data)) === JSON.stringify(protect(previous.data)), `Unrelated metadata changed: ${post.id}`);
  check(sha(current.content) === original.markdown_body_sha256 && post.renderMode === 'preserved', `Publication snapshot lost: ${post.id}`);
  check(post.url === original.url && post.date === original.date && post.updated === original.updated, `URL or date changed: ${post.id}`);
  check(post.tags.length >= 1 && post.tags.length <= 5 && new Set(post.tags).size === post.tags.length, `Invalid tags: ${post.id}`);
  check(!post.tags.some(tag => ['课程笔记', '考试', '作业', '概述', '学习', '总结'].includes(tag) || /^20\d{2}[-年]/.test(tag)), `Identity used as a knowledge tag: ${post.id}`);
  if (post.course) {
    const course = byCourse.get(post.course);
    check(course?.sourceDirectory === post.id.split('/')[0], `Wrong course membership: ${post.id}`);
    check(course?.groups.some(group => group.id === post.course_group) && Number.isInteger(post.course_order), `Wrong course group/order: ${post.id}`);
  }
}

for (const course of courses) {
  const members = posts.filter(post => post.course === course.slug);
  check(members.length > 0, `Empty course: ${course.slug}`);
  check(fs.existsSync(`dist/courses/${course.slug}/index.html`), `Missing course route: ${course.slug}`);
  for (const group of course.groups) {
    const orders = members.filter(post => post.course_group === group.id).map(post => post.course_order);
    check(orders.length === new Set(orders).size, `Duplicate course order: ${course.slug}/${group.id}`);
  }
}

const report = { articles: posts.length, courses: courses.length, courseArticles: posts.filter(post => post.course).length, tags: new Set(posts.flatMap(post => post.tags)).size, bodiesPreserved: posts.filter(post => post.renderMode === 'preserved').length, failures };
fs.writeFileSync('migration/taxonomy-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (failures.length) process.exitCode = 1;
