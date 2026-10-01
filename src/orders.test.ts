import assert from "node:assert/strict";
import { test } from "node:test";
import { CreateLetterSchema, CreatePostcardSchema } from "./orders.ts";

const addr = { name: "Sam Rivera", line1: "12 Oak St", city: "Austin", state: "tx", zip: "78701" };

test("postcard needs an image or a headline", () => {
  const base = { to: addr, from: addr, content: { message: "hi" } };
  assert.equal(CreatePostcardSchema.safeParse(base).success, false);
  const ok = CreatePostcardSchema.parse({ ...base, content: { message: "hi", front_headline: "Hello" } });
  assert.equal(ok.size, "4x6");
  assert.equal(ok.to.state, "TX");
});

test("rejects non-https images and non-US addresses", () => {
  const content = { message: "hi", front_image_url: "http://example.com/a.jpg" };
  assert.equal(CreatePostcardSchema.safeParse({ to: addr, from: addr, content }).success, false);
  assert.equal(CreateLetterSchema.safeParse({ to: { ...addr, zip: "SW1A 1AA" }, from: addr, content: { body: "x" } }).success, false);
});

test("uploaded image paths are allowed", () => {
  const content = { message: "hi", front_image_url: "/images/img_abc123" };
  assert.equal(CreatePostcardSchema.safeParse({ to: addr, from: addr, content }).success, true);
});
