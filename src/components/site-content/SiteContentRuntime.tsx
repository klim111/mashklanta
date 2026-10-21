'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { normalizeText, textRulesForPath, type SiteContent } from '@/lib/site-content';
import { SITE_CONTENT_PENDING_CLASS } from './siteContentBoot';
import { SITE_EDIT_EVENT, SITE_EDIT_PARAM, readEditFlag, writeEditFlag } from './editFlag';

const SiteEditMode = dynamic(() => import('./SiteEditMode').then((mod) => mod.SiteEditMode), { ssr: false });

/** מה שלא משנים: העורך עצמו, שדות שהמשתמש מקליד בהם, וקוד */
export const SKIP_SELECTOR = '[data-site-content-skip], script, style, noscript, textarea, [contenteditable="true"]';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** הטקסט המקורי של כל צומת שהוחלף, והערך שהוצב בו — כדי לזהות כש-React מחליף אותו בעצמו */
const originals = new WeakMap<Text, string>();
const applied = new WeakMap<Text, string>();
const changed = new Set<Text>();
const originalPlaceholders = new WeakMap<Element, string>();
const appliedPlaceholders = new WeakMap<Element, string>();
const changedPlaceholders = new Set<Element>();

/** הטקסט המקורי של צומת — גם אחרי שהוחלף. משמש את העריכה על הדף */
export function originalTextOf(node: Text): string {
  const current = node.nodeValue ?? '';
  return applied.get(node) === current ? (originals.get(node) ?? current) : current;
}

function keepWhitespace(original: string, replacement: string): string {
  const lead = original.match(/^\s*/)?.[0] ?? '';
  const trail = original.match(/\s*$/)?.[0] ?? '';
  return `${lead}${replacement}${trail}`;
}

function applyText(node: Text, rules: Map<string, string>) {
  if (node.parentElement?.closest(SKIP_SELECTOR)) return;
  const current = node.nodeValue ?? '';
  // הערך השתנה מאז שהחלפנו אותו (או שלא הוחלף מעולם) — זה הטקסט המקורי החדש
  if (applied.get(node) !== current) originals.set(node, current);
  const original = originals.get(node) ?? current;
  const replacement = rules.get(normalizeText(original));
  const next = replacement === undefined ? original : keepWhitespace(original, replacement);
  if (replacement === undefined && !changed.has(node)) return;
  if (current !== next) node.nodeValue = next;
  applied.set(node, next);
  if (replacement === undefined) changed.delete(node);
  else changed.add(node);
}

function applyPlaceholder(element: Element, rules: Map<string, string>) {
  if (element.closest('[data-site-content-skip]')) return;
  const current = element.getAttribute('placeholder') ?? '';
  if (appliedPlaceholders.get(element) !== current) originalPlaceholders.set(element, current);
  const original = originalPlaceholders.get(element) ?? current;
  const replacement = rules.get(normalizeText(original));
  if (replacement === undefined && !changedPlaceholders.has(element)) return;
  const next = replacement ?? original;
  if (current !== next) element.setAttribute('placeholder', next);
  appliedPlaceholders.set(element, next);
  if (replacement === undefined) changedPlaceholders.delete(element);
  else changedPlaceholders.add(element);
}

function applyTree(root: Node, rules: Map<string, string>) {
  if (root.nodeType === Node.TEXT_NODE) {
    applyText(root as Text, rules);
    return;
  }
  if (!(root instanceof Element || root instanceof DocumentFragment)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if ((node.nodeValue ?? '').trim()) applyText(node as Text, rules);
  }
  const withPlaceholder = root instanceof Element && root.hasAttribute('placeholder') ? [root] : [];
  withPlaceholder.concat(Array.from(root.querySelectorAll('[placeholder]'))).forEach((element) =>
    applyPlaceholder(element, rules)
  );
}

/**
 * מחיל את החלפות הטקסט של "תוכן האתר" על העמוד הנוכחי, ועוקב אחרי כל שינוי
 * בעמוד (מסכים שנטענים, חלונות שנפתחים, מעבר בין עמודים) כדי להחיל גם עליהם.
 * כשהיועץ נכנס ל"עריכה על הדף", מציג גם את סרגל העריכה.
 */
export function SiteContentRuntime({ content: initialContent }: { content: SiteContent }) {
  const pathname = usePathname() ?? '/';
  const [content, setContent] = useState(initialContent);
  const [editing, setEditing] = useState(false);

  useEffect(() => setContent(initialContent), [initialContent]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has(SITE_EDIT_PARAM)) {
      writeEditFlag(true);
      params.delete(SITE_EDIT_PARAM);
      const query = params.toString();
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    }
    setEditing(readEditFlag());
    const onChange = (event: Event) => setEditing((event as CustomEvent<boolean>).detail);
    window.addEventListener(SITE_EDIT_EVENT, onChange);
    return () => window.removeEventListener(SITE_EDIT_EVENT, onChange);
  }, []);

  const rules = useMemo(() => textRulesForPath(content, pathname), [content, pathname]);

  useIsomorphicLayoutEffect(() => {
    const reveal = () => document.documentElement.classList.remove(SITE_CONTENT_PENDING_CLASS);
    if (rules.size === 0 && changed.size === 0 && changedPlaceholders.size === 0) {
      reveal();
      return;
    }
    // צמתים שכבר הוחלפו ואינם בעמוד עוד — לא צריך לזכור אותם
    changed.forEach((node) => !node.isConnected && changed.delete(node));
    changedPlaceholders.forEach((element) => !element.isConnected && changedPlaceholders.delete(element));
    applyTree(document.body, rules);
    reveal();
    if (rules.size === 0) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') applyText(mutation.target as Text, rules);
        else if (mutation.type === 'attributes') applyPlaceholder(mutation.target as Element, rules);
        else mutation.addedNodes.forEach((node) => applyTree(node, rules));
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder'],
    });
    return () => observer.disconnect();
  }, [rules]);

  if (!editing) return null;
  return (
    <SiteEditMode
      content={content}
      onContentChange={setContent}
      onExit={() => writeEditFlag(false)}
    />
  );
}
