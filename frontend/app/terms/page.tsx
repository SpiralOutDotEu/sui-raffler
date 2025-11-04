import fs from "fs";
import path from "path";

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function basicMarkdownToHtml(md: string): string {
  // Escape HTML first
  let html = escapeHtml(md);

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic _text_
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");
  // Links [text](url)
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Headings ####, ###, ##, # (support up to h4 which covers file usage)
  html = html.replace(/^####\s+(.*)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");

  // Horizontal rules ---
  html = html.replace(/^---$/gm, "<hr />");

  // Lists - item
  html = html.replace(/(^|\n)-\s+(.*)(?=(\n(?!-\s)|$))/g, (match) => {
    const items = match
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "))
      .map((line) => `<li>${line.substring(2)}</li>`) // remove "- "
      .join("");
    return items ? `<ul>${items}</ul>` : match;
  });

  // Numbered lists 1. item
  html = html.replace(/(^|\n)\d+\.\s+(.*)(?=(\n(?!\d+\.\s)|$))/g, (match) => {
    const items = match
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+\.\s+/.test(line))
      .map((line) => line.replace(/^\d+\.\s+/, ""))
      .map((text) => `<li>${text}</li>`)
      .join("");
    return items ? `<ol>${items}</ol>` : match;
  });

  // Paragraphs: wrap non-empty lines not already in tags into <p>
  html = html
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<h\d|^<ul>|^<ol>|^<hr\s*\/>/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br />")}<\/p>`;
    })
    .join("\n");

  return html;
}

export default async function TermsPage() {
  const termsPath = path.join(
    process.cwd(),
    "app",
    "terms",
    "terms_and_conditions.md"
  );
  const raw = fs.readFileSync(termsPath, "utf-8");
  const html = basicMarkdownToHtml(raw);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-6">
        Terms and Conditions
      </h1>
      <article
        className="prose prose-indigo max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
