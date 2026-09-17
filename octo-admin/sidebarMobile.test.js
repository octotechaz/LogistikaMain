'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const PARTIALS = path.join(__dirname, 'views/partials');

function header() { return fs.readFileSync(path.join(PARTIALS, 'header.ejs'), 'utf8'); }
function footer() { return fs.readFileSync(path.join(PARTIALS, 'footer.ejs'), 'utf8'); }

// Extract the full opening <button ...> tag that contains the given id attribute value.
function buttonTag(src, id) {
  for (const m of src.matchAll(/<button\b([^>]*)>/g)) {
    if (m[1].includes(`id="${id}"`)) return m[0];
  }
  return null;
}

test('header.ejs #toggleSidebar has type="button"', () => {
  const tag = buttonTag(header(), 'toggleSidebar');
  assert.ok(tag, '#toggleSidebar must be a <button> element');
  assert.ok(tag.includes('type="button"'), `#toggleSidebar must have type="button"; got: ${tag}`);
});

test('header.ejs #toggleSidebar has aria-label', () => {
  const tag = buttonTag(header(), 'toggleSidebar');
  assert.ok(tag, '#toggleSidebar must be a <button> element');
  assert.ok(tag.includes('aria-label='), `#toggleSidebar must have aria-label; got: ${tag}`);
});

test('header.ejs sidebar-header contains #closeSidebar button', () => {
  assert.ok(header().includes('id="closeSidebar"'), 'header.ejs must contain an element with id="closeSidebar"');
});

test('header.ejs #closeSidebar has type="button"', () => {
  const tag = buttonTag(header(), 'closeSidebar');
  assert.ok(tag, '#closeSidebar must be a <button> element');
  assert.ok(tag.includes('type="button"'), `#closeSidebar must have type="button"; got: ${tag}`);
});

test('header.ejs #closeSidebar has aria-label', () => {
  const tag = buttonTag(header(), 'closeSidebar');
  assert.ok(tag, '#closeSidebar must be a <button> element');
  assert.ok(tag.includes('aria-label='), `#closeSidebar must have aria-label; got: ${tag}`);
});

test('header.ejs has .sidebar-backdrop CSS', () => {
  assert.ok(header().includes('.sidebar-backdrop'), 'header.ejs must define .sidebar-backdrop CSS');
});

test('footer.ejs has #sidebarBackdrop element', () => {
  assert.ok(footer().includes('id="sidebarBackdrop"'), 'footer.ejs must contain an element with id="sidebarBackdrop"');
});

test('footer.ejs JS wires backdrop click to close mobile sidebar', () => {
  assert.match(footer(), /backdrop\.addEventListener\(/, 'footer.ejs must call backdrop.addEventListener');
});

test('footer.ejs JS wires close button click to close mobile sidebar', () => {
  assert.match(footer(), /closeBtn\.addEventListener\(/, 'footer.ejs must call closeBtn.addEventListener');
});

test('footer.ejs JS has Escape key handler', () => {
  assert.ok(
    footer().includes("'Escape'") || footer().includes('"Escape"'),
    'footer.ejs JS must handle the Escape key'
  );
});

test('footer.ejs must not persist user data to localStorage', () => {
  assert.ok(!footer().includes('localStorage.setItem'), 'footer.ejs must not write user data to localStorage');
});

// Regression: desktop resize must unconditionally remove .show from sidebar and backdrop.
// Root defect: closeMobileSidebar() guards on `window.innerWidth <= 991`, so when
// handleResize() calls it on the >991 branch the guard blocks execution, leaving
// sidebar/backdrop with .show stuck open after a window resize to desktop width.
//
// The fix: remove the innerWidth guard from closeMobileSidebar so it always removes
// .show regardless of width. handleResize's else branch can then safely delegate to it.
test('footer.ejs closeMobileSidebar is not gated by innerWidth so desktop resize removes .show', () => {
  const src = footer();

  // Extract the closeMobileSidebar function body
  const fnMatch = src.match(/function closeMobileSidebar\(\)\s*\{([\s\S]*?)\n\s*\}/);
  assert.ok(fnMatch, 'footer.ejs must contain a closeMobileSidebar function');

  const fnBody = fnMatch[1];

  // The body must NOT contain an innerWidth guard — that guard is the defect.
  assert.ok(
    !fnBody.includes('innerWidth'),
    'closeMobileSidebar must not guard on innerWidth; the guard prevents .show removal ' +
    'when handleResize calls this function at desktop width (>991). ' +
    `Actual body: ${fnBody.trim()}`
  );

  // And it must still remove .show from both elements
  assert.ok(
    fnBody.includes("remove('show')") || fnBody.includes('remove("show")'),
    `closeMobileSidebar must call classList.remove('show'); actual body: ${fnBody.trim()}`
  );
});