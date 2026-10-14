import fs from 'node:fs';
import path from 'node:path';

const key = rule => JSON.stringify([rule.id, rule.tag, rule.attribute, rule.url]);

export function loadReferenceRepairs(root = process.cwd()) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/reference-repairs.json'), 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.repairs) || !Array.isArray(manifest.unresolved)) {
    throw new Error('Invalid reference repair manifest.');
  }
  const seen = new Set();
  for (const [status, rules] of Object.entries({ repairs: manifest.repairs, unresolved: manifest.unresolved })) {
    for (const rule of rules) {
      if (!['id', 'tag', 'attribute', 'url'].every(field => typeof rule[field] === 'string' && rule[field]) ||
          !['a:href', 'img:src'].includes(`${rule.tag}:${rule.attribute}`) ||
          !Array.isArray(rule.evidence) || !rule.evidence.length || seen.has(key(rule))) {
        throw new Error(`Invalid or duplicate reference repair: ${key(rule)}`);
      }
      if (status === 'repairs' && (typeof rule.replacement !== 'string' ||
          !/^(?:\/(?!\/)|https?:\/\/)/.test(rule.replacement))) {
        throw new Error(`Repair requires an explicit root-relative or HTTP target: ${key(rule)}`);
      }
      if (status === 'unresolved' && (typeof rule.reason !== 'string' || !rule.reason)) {
        throw new Error(`Unresolved reference requires a reason: ${key(rule)}`);
      }
      seen.add(key(rule));
    }
  }
  return manifest;
}

// Edit only an exact tag attribute, keeping snapshot text, whitespace and markup intact.
// Comments and raw-text elements must not be mistaken for visible document links.
export function applyReferenceRepairs(id, html, manifest) {
  const rules = manifest.repairs.filter(rule => rule.id === id);
  if (!rules.length) return html;
  return html.replace(/<!--[\s\S]*?-->|<(script|style|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>|<[A-Za-z][\w:-]*\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi, tag => {
    const name = tag.match(/^<([A-Za-z][\w:-]*)\b/)?.[1].toLowerCase();
    if (!name || ['script', 'style', 'textarea'].includes(name)) return tag;
    return tag.replace(/(\s)([\w:-]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g,
      (match, space, attribute, equals, double, single, unquoted) => {
        const value = double ?? single ?? unquoted;
        const rule = rules.find(rule => rule.tag === name && rule.attribute === attribute.toLowerCase() && rule.url === value);
        if (!rule) return match;
        const quote = double !== undefined ? '"' : single !== undefined ? "'" : '';
        const replacement = rule.replacement.replace(/&/g, '&amp;').replace(quote === '"' ? /"/g : /'/g, quote === '"' ? '&quot;' : '&#39;');
        return `${space}${attribute}${equals}${quote}${replacement}${quote}`;
      });
  });
}
