#!/usr/bin/env node
/**
 * Loads the branch catalogue (branch code + branch name per bank) into the
 * `BankBranch` table, so the branch drop-downs in the principal-approval form
 * show real branches.
 *
 * Sources, in order of precedence:
 *   1. `--file <path>`      — a local CSV/JSON export (offline installs, CI).
 *   2. `BANK_BRANCHES_URL`  — any URL returning the same JSON/CSV shape.
 *   3. The public Bank of Israel branch dataset published on data.gov.il
 *      (resource id below), which is the authoritative list.
 *
 * Usage:
 *   npm run sync:bank-branches
 *   npm run sync:bank-branches -- --file ./data/branches.csv
 *
 * Accepted column names (Hebrew or English, case-insensitive):
 *   bankCode   | קוד_בנק   | Bank_Code
 *   bankName   | שם_בנק    | Bank_Name
 *   branchCode | קוד_סניף  | Branch_Code
 *   branchName | שם_סניף   | Branch_Name
 *   address    | כתובת     | Address
 *   city       | ישוב      | City
 *   zipCode    | מיקוד     | Zip_Code
 */

import fs from 'node:fs/promises';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const DATA_GOV_RESOURCE = process.env.BANK_BRANCHES_RESOURCE_ID || '1c5bc716-8210-4ec7-85be-92e6271955c2';
const DATA_GOV_URL =
  process.env.BANK_BRANCHES_URL ||
  `https://data.gov.il/api/3/action/datastore_search?resource_id=${DATA_GOV_RESOURCE}&limit=32000`;

const prisma = new PrismaClient();

const COLUMN_ALIASES = {
  bankCode: ['bankcode', 'bank_code', 'קוד_בנק', 'קוד בנק'],
  bankName: ['bankname', 'bank_name', 'שם_בנק', 'שם בנק'],
  branchCode: ['branchcode', 'branch_code', 'קוד_סניף', 'קוד סניף'],
  branchName: ['branchname', 'branch_name', 'שם_סניף', 'שם סניף'],
  address: ['address', 'כתובת', 'כתובת_ סניף', 'כתובת סניף'],
  city: ['city', 'ישוב', 'עיר', 'city_name'],
  zipCode: ['zipcode', 'zip_code', 'מיקוד'],
};

function pick(row, key) {
  const aliases = COLUMN_ALIASES[key];
  for (const [rawKey, value] of Object.entries(row)) {
    const normalized = String(rawKey).trim().toLowerCase();
    if (aliases.includes(normalized)) return value === null || value === undefined ? '' : String(value).trim();
  }
  return '';
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const split = (line) => {
    const out = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map((h) => h.replace(/^﻿/, '').trim());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
}

async function loadRows() {
  const fileArgIndex = process.argv.indexOf('--file');
  if (fileArgIndex !== -1 && process.argv[fileArgIndex + 1]) {
    const path = process.argv[fileArgIndex + 1];
    const text = await fs.readFile(path, 'utf8');
    console.log(`Reading branches from ${path}`);
    return path.endsWith('.json') ? normalizeJson(JSON.parse(text)) : parseCsv(text);
  }

  console.log(`Fetching branches from ${DATA_GOV_URL}`);
  const res = await fetch(DATA_GOV_URL);
  if (!res.ok) throw new Error(`Branch source responded ${res.status} ${res.statusText}`);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('csv')) return parseCsv(await res.text());
  return normalizeJson(await res.json());
}

function normalizeJson(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result?.records)) return payload.result.records;
  if (Array.isArray(payload?.records)) return payload.records;
  throw new Error('Unrecognised branch payload shape');
}

async function main() {
  const rows = await loadRows();
  const mapped = rows
    .map((row) => ({
      bankCode: pick(row, 'bankCode'),
      bankName: pick(row, 'bankName'),
      branchCode: pick(row, 'branchCode'),
      branchName: pick(row, 'branchName'),
      address: pick(row, 'address') || null,
      city: pick(row, 'city') || null,
      zipCode: pick(row, 'zipCode') || null,
    }))
    .filter((row) => row.bankCode && row.branchCode);

  if (mapped.length === 0) {
    throw new Error('No usable branch rows found — check the column names of the source.');
  }

  let written = 0;
  for (const row of mapped) {
    const where = { bankCode_branchCode: { bankCode: row.bankCode, branchCode: row.branchCode } };
    const data = { ...row, branchName: row.branchName || `סניף ${row.branchCode}`, bankName: row.bankName || `בנק ${row.bankCode}` };
    await prisma.bankBranch.upsert({ where, create: data, update: data });
    written += 1;
    if (written % 250 === 0) console.log(`  ${written}/${mapped.length}…`);
  }

  const banks = await prisma.bankBranch.groupBy({ by: ['bankCode'], _count: { _all: true } });
  console.log(`\nSynced ${written} branches across ${banks.length} banks:`);
  for (const bank of banks.sort((a, b) => Number(a.bankCode) - Number(b.bankCode))) {
    console.log(`  bank ${bank.bankCode.padStart(2, ' ')}: ${bank._count._all} branches`);
  }
}

main()
  .catch((err) => {
    console.error(`\nBranch sync failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
