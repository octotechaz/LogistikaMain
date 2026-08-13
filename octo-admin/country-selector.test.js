"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const views = ["login.ejs", "qeydiyyat.ejs"];

for (const view of views) {
  test(`${view} defaults to Azerbaijan and offers additional country codes`, () => {
    const source = fs.readFileSync(path.join(__dirname, "views", view), "utf8");

    assert.match(source, /data-value="994"/);
    assert.match(source, /data-value="90"/);
    assert.match(source, /data-value="995"/);
    assert.match(source, /data-value="7"/);
  });
}

test("login keeps the selected country separate from the local phone field", () => {
  const source = fs.readFileSync(path.join(__dirname, "views", "login.ejs"), "utf8");

  assert.match(source, /id="phoneIdentityInput" name="identifier"/);
  assert.match(source, /Yalnız yerli nömrə/);
  assert.doesNotMatch(source, /name="email" id="phoneIdentityInput"/);
});

test("login exposes separate phone and e-mail identity modes", () => {
  const source = fs.readFileSync(path.join(__dirname, "views", "login.ejs"), "utf8");

  assert.match(source, /data-login-mode="phone"/);
  assert.match(source, /data-login-mode="email"/);
  assert.match(source, /id="phoneIdentityInput" name="identifier"/);
  assert.match(source, /id="emailIdentityInput" name="identifier" disabled/);
  assert.match(source, /id="phoneIdentityPanel"/);
  assert.match(source, /id="emailIdentityPanel" hidden/);
});

test("login keeps the selector in phone mode and clears the inactive identity", () => {
  const source = fs.readFileSync(path.join(__dirname, "views", "login.ejs"), "utf8");

  assert.match(source, /phoneIdentityPanel\.hidden = mode !== 'phone'/);
  assert.match(source, /emailIdentityPanel\.hidden = mode !== 'email'/);
  assert.match(source, /inactiveInput\.value = ''/);
  assert.match(source, /activeInput\.focus\(\)/);
});
