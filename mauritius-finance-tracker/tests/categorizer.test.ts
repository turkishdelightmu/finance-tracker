import { describe, expect, it } from "vitest";
import { categorizeTransaction } from "../src/lib/categorizer";

const rules = [
  {
    id: "r1",
    userId: "u1",
    keyword: "coffee",
    merchant: null,
    categoryId: "cat-food",
    priority: 10,
    createdAt: new Date(),
  },
];

const dictionary = [
  {
    id: "k1",
    keyword: "winners",
    categoryId: "cat-grocery",
    isGlobal: true,
    createdAt: new Date(),
  },
];

it("prioritizes user rules over dictionary", () => {
  const category = categorizeTransaction({
    description: "Morning coffee",
    merchant: "Local cafe",
    rules,
    dictionary,
  });
  expect(category).toBe("cat-food");
});

it("falls back to keyword dictionary", () => {
  const category = categorizeTransaction({
    description: "Winners shopping",
    merchant: "Winners",
    rules: [],
    dictionary,
  });
  expect(category).toBe("cat-grocery");
});

it("returns null when no match", () => {
  const category = categorizeTransaction({
    description: "Unknown vendor",
    merchant: "Unknown",
    rules: [],
    dictionary: [],
  });
  expect(category).toBeNull();
});
