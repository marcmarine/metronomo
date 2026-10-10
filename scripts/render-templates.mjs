import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import vento from "ventojs";

const templatesDir = "templates";
const pagesDir = join(templatesDir, "pages");

const env = vento({
	includes: `./${templatesDir}`,
});

async function collectVtoFiles(dir) {
	const entries = await readdir(dir);
	const files = [];

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const info = await stat(fullPath);

		if (info.isDirectory()) {
			files.push(...(await collectVtoFiles(fullPath)));
			continue;
		}

		if (extname(entry) === ".vto" && !basename(entry).startsWith("_")) {
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

async function main() {
	const pageFiles = await collectVtoFiles(pagesDir);

	for (const absPath of pageFiles) {
		const relFromPages = relative(pagesDir, absPath);
		const templatePath = `pages/${relFromPages.replaceAll("\\", "/")}`;
		const outPath = outputPathFromTemplate(relFromPages);

		const result = await env.run(templatePath, {});
		const html = typeof result === "string" ? result : result.content;

		await mkdir(dirname(outPath), { recursive: true });
		await writeFile(outPath, html, "utf8");

		console.log(`✓ ${templatePath} -> ${outPath}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
