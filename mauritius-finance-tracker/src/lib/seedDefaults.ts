import { prisma } from "@/lib/prisma";
import { defaultCategories, defaultKeywordMap } from "@/lib/defaults";

export async function createDefaultsForUser(userId: string) {
  const categories = await prisma.$transaction(
    defaultCategories.map((category) =>
      prisma.category.create({
        data: {
          userId,
          name: category.name,
          color: category.color,
        },
      }),
    ),
  );

  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  await prisma.$transaction(
    defaultKeywordMap.map((entry) =>
      prisma.keywordDictionary.create({
        data: {
          keyword: entry.keyword,
          categoryId: categoryByName.get(entry.category)!.id,
          isGlobal: true,
        },
      }),
    ),
  );
}
