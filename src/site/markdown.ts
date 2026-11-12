import { VaporfitError } from '#errors.ts';

import type { BrokenCell, DeclaredCell, LibraryPage, LibraryRow, RuleRow } from './table.ts';

const BREAK = '<br>';
const START = '<!-- prettier-ignore-start -->';
const END = '<!-- prettier-ignore-end -->';

function text(value: string): string {
  return value.replaceAll(/[|<>]/gu, String.raw`\$&`);
}

/** A short link text. A GitHub link gives the repository and the last part of the path. */
function linkText(url: string): string {
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/.*?([^/]+)$/u.exec(url);
  if (match === null) {
    return url.replace(/^https?:\/\//u, '');
  }
  return `${match[1]} ${match[2]}`;
}

function link(url: string): string {
  return `[${text(linkText(url))}](${url})`;
}

function declaredCell(declared: DeclaredCell): string {
  if (declared.kind === 'none') {
    return declared.text;
  }
  const lines = [`Scope: ${declared.scope}`, link(declared.url)];
  if (declared.since !== null) {
    lines.push(`First version: ${text(declared.since)}`);
  }
  return lines.join(BREAK);
}

function brokenCell(broken: BrokenCell): string {
  const fix = broken.fixedInVue === null ? [] : [`Fixed in Vue ${text(broken.fixedInVue)}`];
  return [
    `\`${broken.id}\``,
    `Failure: ${broken.failure}`,
    ...fix,
    ...broken.issues.map(link),
  ].join(BREAK);
}

function libraryLine(row: LibraryRow): string {
  const cells = [
    `**${text(row.package)}**${BREAK}[edit this row](${row.editUrl})`,
    text(row.version),
    declaredCell(row.declared),
    row.tested.map(item => text(`${item.depth}, ${item.environment}`)).join(BREAK),
    row.broken.map(brokenCell).join(BREAK + BREAK),
    row.mark === null ? row.date : `${row.date} ${row.mark}`,
  ];
  return `| ${cells.join(' | ')} |`;
}

export function libraryMarkdown(page: LibraryPage): string {
  return [
    `The build date is ${page.builtOn}.`,
    '',
    '| Library | Verified version | Declared by maintainers | Tested by us | Known broken | Last verified date |',
    '| --- | --- | --- | --- | --- | --- |',
    ...page.rows.map(libraryLine),
  ].join('\n');
}

export function ruleMarkdown(rows: RuleRow[]): string {
  return [
    '| Id | Title | Failure | Tiers | Sources |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      row =>
        `| \`${row.id}\` | ${text(row.title)} | ${row.failure} | ${row.tiers.join(', ')} | ${row.sources.map(link).join(BREAK)} |`,
    ),
  ].join('\n');
}

/**
 * Puts content between the two marker comments of a page. The markers also stop the formatter,
 * so a new build does not change the layout of the table.
 */
export function fillBlock(source: string, content: string): string {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start === -1 || end < start) {
    throw new VaporfitError('The page has no block for the table');
  }
  return `${source.slice(0, start + START.length)}\n\n${content}\n\n${source.slice(end)}`;
}
