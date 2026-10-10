import {
	mkdir,
	readdir,
	readFile,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import vento from "ventojs";

const templatesDir = "templates";
const pagesDir = join(templatesDir, "pages");
const markdownPagesDir = "content/pages";
const generatedManifestPath = ".generated-pages.json";

const env = vento({
	includes: `./${templatesDir}`,
});

const md = new MarkdownIt({
	html: false,
	linkify: true,
	typographer: true,
});

async function collectFiles(dir, extension) {
	const entries = await readdir(dir);
	const files = [];

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const info = await stat(fullPath);

		if (info.isDirectory()) {
			files.push(...(await collectFiles(fullPath, extension)));
			continue;
		}

		if (extname(entry) === extension && !basename(entry).startsWith("_")) {
			files.push(fullPath);
		}
	}

	return files;
}

function outputPathFromTemplate(relFromPages) {
	const normalized = relFromPages.replaceAll("\\", "/");

	if (normalized === "index.vto") return "index.html";

	return normalized.replace(/\.vto$/, ".html");
}

function ensureString(value, fallback = "") {
	return typeof value === "string" ? value : fallback;
}

function inferDescription(markdownBody) {
	const firstParagraph = markdownBody
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.find((block) => block && !block.startsWith("#"));

	if (!firstParagraph) return "";

	return firstParagraph.replace(/\s+/g, " ").slice(0, 170);
}

async function loadPreviousGeneratedPages() {
	try {
		const raw = await readFile(generatedManifestPath, "utf8");
		const parsed = JSON.parse(raw);

		if (!Array.isArray(parsed.pages)) return [];
		return parsed.pages.filter((page) => typeof page === "string");
	} catch {
		return [];
	}
}

async function writeGeneratedManifest(pages) {
	const sortedPages = [...pages].sort();
	await writeFile(
		generatedManifestPath,
		`${JSON.stringify({ pages: sortedPages }, null, 2)}\n`,
		"utf8",
	);
}

async function cleanupStalePages(previousPages, currentPages) {
	const currentSet = new Set(currentPages);

	for (const page of previousPages) {
		if (currentSet.has(page)) continue;

		try {
			await unlink(page);
			console.log(`- removed stale page: ${page}`);
		} catch {
			// ignore stale pages already deleted
		}
	}
}

async function renderVtoPages(generatedPages) {
	const pageFiles = await collectFiles(pagesDir, ".vto");

	for (const absPath of pageFiles) {
		const relFromPages = relative(pagesDir, absPath);
		const templatePath = `pages/${relFromPages.replaceAll("\\", "/")}`;
		const outPath = outputPathFromTemplate(relFromPages);

		const result = await env.run(templatePath, {});
		const html = typeof result === "string" ? result : result.content;

		await mkdir(dirname(outPath), { recursive: true });
		await writeFile(outPath, html, "utf8");
		generatedPages.push(outPath);

		console.log(`✓ ${templatePath} -> ${outPath}`);
	}
}

async function renderMarkdownPages(generatedPages) {
	let markdownFiles = [];

	try {
		markdownFiles = await collectFiles(markdownPagesDir, ".md");
	} catch {
		return;
	}

	for (const absPath of markdownFiles) {
		const source = await readFile(absPath, "utf8");
		const parsed = matter(source);
		const filename = basename(absPath, ".md");

		const title = ensureString(parsed.data.title, filename);
		const description = ensureString(
			parsed.data.description,
			inferDescription(parsed.content),
		);
		const slug = ensureString(parsed.data.slug, filename)
			.trim()
			.replace(/^\/+|\/+$/g, "");
		const lang = ensureString(parsed.data.lang, "es");
		const canonical = ensureString(parsed.data.canonical);

		const markdownHtml = md.render(parsed.content);
		const result = await env.run("layouts/content-page.vto", {
			title,
			description,
			lang,
			canonical,
			markdownHtml,
		});
		const html = typeof result === "string" ? result : result.content;
		const outPath = `${slug}.html`;

		await mkdir(dirname(outPath), { recursive: true });
		await writeFile(outPath, html, "utf8");
		generatedPages.push(outPath);

		console.log(`✓ ${relative(".", absPath)} -> ${outPath}`);
	}
}

async function main() {
	const previousPages = await loadPreviousGeneratedPages();
	const generatedPages = [];

	await renderVtoPages(generatedPages);
	await renderMarkdownPages(generatedPages);
	await cleanupStalePages(previousPages, generatedPages);
	await writeGeneratedManifest(generatedPages);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
