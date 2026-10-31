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

test("return address may be outside the US; recipient may not", () => {
  const content = { body: "x" };
  const uk = { name: "Alex Doe", line1: "10 Downing Street", city: "London", zip: "sw1a 2aa", country: "gb" };
  const ok = CreateLetterSchema.parse({ to: addr, from: uk, content });
  assert.deepEqual(ok.from, { name: "Alex Doe", line1: "10 Downing Street", city: "London", zip: "SW1A 2AA", country: "GB" });
  // No postcode is fine abroad (PostGrid fills it in); a bad code or a non-US recipient is not.
  assert.equal(CreateLetterSchema.safeParse({ to: addr, from: { ...uk, zip: undefined }, content }).success, true);
  assert.equal(CreateLetterSchema.safeParse({ to: addr, from: { ...uk, country: "XX" }, content }).success, false);
  assert.equal(CreateLetterSchema.safeParse({ to: { ...addr, country: "GB" }, from: addr, content }).success, true, "unknown keys on `to` are stripped, it stays US");
  assert.equal(CreateLetterSchema.safeParse({ to: { ...uk }, from: addr, content }).success, false);
});

test("a US return address keeps every US rule and its old stored shape", () => {
  const content = { body: "x" };
  const us = CreateLetterSchema.parse({ to: addr, from: { ...addr, country: "us" }, content }).from;
  assert.deepEqual(us, { name: "Sam Rivera", line1: "12 Oak St", city: "Austin", state: "TX", zip: "78701" });
  assert.deepEqual(CreateLetterSchema.parse({ to: addr, from: addr, content }).from, us);
  assert.equal(CreateLetterSchema.safeParse({ to: addr, from: { ...addr, state: undefined }, content }).success, false);
  assert.equal(CreateLetterSchema.safeParse({ to: addr, from: { ...addr, zip: "SW1A 2AA" }, content }).success, false);
  // US territories are US addresses with a state code, not countries.
  assert.equal(CreateLetterSchema.safeParse({ to: addr, from: { ...addr, country: "PR" }, content }).success, false);
});
