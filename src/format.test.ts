import { test } from "node:test";
import assert from "node:assert/strict";
import { formatInline, letterParagraphs, stripInline } from "./render.ts";

// Letter text from the web form's B / I / U buttons (2026-11-22): only <b>, <i>, <u> survive; everything else is escaped.
test("only bare <b>, <i> and <u> become markup; everything else stays escaped", () => {
  assert.equal(formatInline("Hello <b>Pat</b>, <i>thanks</i> and <u>see you</u>"), "Hello <b>Pat</b>, <i>thanks</i> and <u>see you</u>");
  assert.equal(formatInline('<script>alert(1)</script>'), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(formatInline('<b class="x">no attributes</b>'), "&lt;b class=&quot;x&quot;&gt;no attributes");
  assert.equal(formatInline('<img src=x onerror=alert(1)>'), "&lt;img src=x onerror=alert(1)&gt;");
  assert.equal(formatInline("Tom & Jerry say 2 < 3"), "Tom &amp; Jerry say 2 &lt; 3");
  assert.equal(formatInline("<B>caps</B>"), "&lt;B&gt;caps&lt;/B&gt;");
});

test("stray closers are dropped, overlaps re-nested, and nothing is left open", () => {
  assert.equal(formatInline("a</b>b"), "ab");
  assert.equal(formatInline("<b>open"), "<b>open</b>");
  assert.equal(formatInline("<b>one <i>two</b> three</i>"), "<b>one <i>two</i></b><i> three</i>");
  assert.equal(formatInline("<b><i><u>x"), "<b><i><u>x</u></i></b>");
});

test("paragraphs and line breaks, and a style can't run into the next paragraph", () => {
  assert.equal(letterParagraphs("Dear <b>Pat\n\nhello</b>\nthere"), "<p>Dear <b>Pat</b></p><p>hello<br>there</p>");
  assert.equal(letterParagraphs("Hi", "margin:0 0 1em"), '<p style="margin:0 0 1em">Hi</p>');
  assert.equal(stripInline("<b>Bold</b> and <i>it</i> <u>u</u> <s>s</s>"), "Bold and it u <s>s</s>");
});
