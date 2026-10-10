/**
 * מעתיק את השדות הפיננסיים הגלויים לעמודות המוצפנות, ומחשב טווח הכנסה.
 *
 * רץ פעם אחת לפני מיגרציית מחיקת העמודות הגלויות (`drop_plaintext_financials`).
 * אחרי המיגרציה הזו אין יותר מה להעתיק.
 *
 * הרצה:
 *   node --env-file=.env scripts/backfill-encrypted-financials.mjs --dry-run
 *   node --env-file=.env scripts/backfill-encrypted-financials.mjs
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;

const FIELDS = ['income', 'partnerIncome', 'expenses', 'existingLoans', 'creditScore', 'downPayment'];

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

function getKey() {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error('FIELD_ENCRYPTION_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(`FIELD_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}`);
  }
  return key;
}

function encryptNumber(value, context) {
  if (value === null || value === undefined) return null;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
}

function decryptNumber(payload, context) {
  if (payload === null || payload === undefined) return null;
  const [version, ivB64, tagB64, ciphertextB64] = payload.split('.');
  if (version !== 'v1') throw new Error(`Unsupported encryption version: ${version}`);
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAAD(Buffer.from(context, 'utf8'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const parsed = Number(
    Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]).toString('utf8')
  );
  if (!Number.isFinite(parsed)) throw new Error(`Decrypted value for ${context} is not a number`);
  return parsed;
}

function incomeBucketFor(income, partnerIncome) {
  if (income === null && partnerIncome === null) return null;
  const total = (income ?? 0) + (partnerIncome ?? 0);
  if (total < 10_000) return 'UNDER_10K';
  if (total < 15_000) return 'FROM_10K_TO_15K';
  if (total < 25_000) return 'FROM_15K_TO_25K';
  if (total < 40_000) return 'FROM_25K_TO_40K';
  return 'ABOVE_40K';
}

async function main() {
  const clients = await prisma.client.findMany();
  console.log(`לקוחות: ${clients.length}`);

  let updated = 0;
  let unchanged = 0;

  for (const client of clients) {
    const financials = {};
    const data = {};

    for (const field of FIELDS) {
      const encColumn = `${field}Enc`;
      financials[field] =
        client[encColumn] !== null ? decryptNumber(client[encColumn], field) : client[field];

      if (client[encColumn] === null && financials[field] !== null) {
        data[encColumn] = encryptNumber(
          field === 'creditScore' ? Math.round(financials[field]) : financials[field],
          field
        );
      }
    }

    const bucket = incomeBucketFor(financials.income, financials.partnerIncome);
    if (bucket !== client.incomeBucket) data.incomeBucket = bucket;

    if (Object.keys(data).length === 0) {
      unchanged += 1;
      continue;
    }

    updated += 1;
    if (dryRun) {
      console.log(`  ${client.id}: ${Object.keys(data).join(', ')}`);
      continue;
    }

    await prisma.client.update({ where: { id: client.id }, data });
  }

  console.log(`עודכנו: ${updated}, ללא שינוי: ${unchanged}`);
  if (dryRun) console.log('הרצה יבשה — לא בוצע שינוי. הרץ ללא --dry-run כדי לכתוב.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
