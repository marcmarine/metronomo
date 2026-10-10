import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const generatedManifestPath = ".generated-pages.json";

function loadHtmlInputs() {
	if (!existsSync(generatedManifestPath)) return undefined;

	try {
		const raw = readFileSync(generatedManifestPath, "utf8");
		const parsed = JSON.parse(raw);
		const pages = Array.isArray(parsed.pages)
			? parsed.pages.filter(
					(page: unknown): page is string =>
						typeof page === "string" && page.endsWith(".html"),
				)
			: [];

		if (!pages.length) return undefined;

		return Object.fromEntries(
			pages.map((page: string) => [page.replace(/\.html$/, ""), resolve(page)]),
		);
	} catch {
		return undefined;
	}
}

const input = loadHtmlInputs();

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		rollupOptions: {
			input,
		},
	},
});
