/**
 * Cập nhật câu hỏi trong DB — bỏ A/B/C/D thừa ở đầu câu
 * Chạy: npx tsx scripts/sanitize-quiz-db.ts
 */
import { PrismaClient } from '@prisma/client';
import { sanitizeQuizQuestion } from '../src/quiz/quiz-text.util';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.quizQuestion.findMany();
  let updated = 0;
  for (const row of rows) {
    const clean = sanitizeQuizQuestion(row.question);
    if (clean !== row.question) {
      await prisma.quizQuestion.update({
        where: { id: row.id },
        data: { question: clean },
      });
      updated++;
    }
  }
  console.log(`Đã sửa ${updated}/${rows.length} câu trong database`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
