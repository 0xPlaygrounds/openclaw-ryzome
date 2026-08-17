import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	McpServer,
	ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	buildCanvasAppUrl,
	buildDocumentViewAppUrl,
	formatDocumentAsMarkdown,
	parseConfig,
	RyzomeApiError,
	RyzomeClient,
	toolRegistry,
	formatCanvasAsMarkdown,
} from "@ryzome-ai/ryzome-core";
import type { RyzomeClientConfig } from "@ryzome-ai/ryzome-core";

function resourceIdToString(id: string | string[]): string {
	return Array.isArray(id) ? (id[0] ?? "") : id;
}

// Resolved from the package manifest so the advertised MCP server version
// tracks package.json without a manual string edit at each release.
const packageJsonPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../package.json",
);
const { version: SERVER_VERSION } = JSON.parse(
	readFileSync(packageJsonPath, "utf8"),
) as { version: string };

function resolveClientConfig(): RyzomeClientConfig | null {
	const cfg = parseConfig({});
	if (!cfg.apiKey) return null;
	return { apiKey: cfg.apiKey, apiUrl: cfg.apiUrl, appUrl: cfg.appUrl };
}

function notConfiguredError() {
	return {
		content: [
			{
				type: "text" as const,
				text: "Ryzome API key not configured. Set the RYZOME_API_KEY environment variable.",
			},
		],
		isError: true,
	};
}

export function createRyzomeMcpServer(): McpServer {
	const server = new McpServer({
		name: "ryzome",
		version: SERVER_VERSION,
	});

	const clientConfig = resolveClientConfig();

	// ── Tools ──────────────────────────────────────────────

	for (const tool of toolRegistry) {
		server.tool(
			tool.name,
			tool.description,
			tool.paramsSchema.shape,
			async (params) => {
				if (!clientConfig) return notConfiguredError();

				try {
					return await tool.execute(params, clientConfig);
				} catch (error) {
					const message =
						error instanceof RyzomeApiError
							? `Ryzome API error: ${error.message}`
							: error instanceof Error
								? error.message
								: String(error);

					return {
						content: [{ type: "text" as const, text: message }],
						isError: true,
					};
				}
			},
		);
	}

	// ── Resources ──────────────────────────────────────────

	server.resource(
		"canvas-list",
		"ryzome://canvases",
		{
			description:
				"List all Ryzome canvases with their IDs, names, and descriptions",
			mimeType: "application/json",
		},
		async (uri) => {
			if (!clientConfig) {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain" as const,
							text: "Ryzome API key not configured.",
						},
					],
				};
			}

			const client = new RyzomeClient(clientConfig);
			const result = await client.listCanvases();
			const summaries = result.data.map((c) => ({
				id: c._id.$oid,
				name: c.name,
				description: c.description ?? null,
				pinned: c.pinned ?? false,
				updatedAt: c.updatedAt,
				url: buildCanvasAppUrl(clientConfig.appUrl, c._id.$oid),
			}));

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json" as const,
						text: JSON.stringify(summaries, null, 2),
					},
				],
			};
		},
	);

	server.resource(
		"document-list",
		"ryzome://documents",
		{
			description:
				"List all Ryzome documents with their IDs, titles, content types, and URLs",
			mimeType: "application/json",
		},
		async (uri) => {
			if (!clientConfig) {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain" as const,
							text: "Ryzome API key not configured.",
						},
					],
				};
			}

			const client = new RyzomeClient(clientConfig);
			const result = await client.listDocuments({ inLibraryOnly: true });
			const summaries = result.data.map((document) => ({
				id: document._id.$oid,
				title: document.title ?? "Untitled",
				description: document.description ?? null,
				contentType: document.content._type,
				inLibrary: document.inLibrary ?? false,
				isFavorite: document.isFavorite ?? false,
				updatedAt: document.updatedAt,
				url: buildDocumentViewAppUrl(clientConfig.appUrl, document),
			}));

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json" as const,
						text: JSON.stringify(summaries, null, 2),
					},
				],
			};
		},
	);

	server.resource(
		"bundle-list",
		"ryzome://bundles",
		{
			description: "List all library-visible Ryzome bundles with their IDs, titles, and URLs",
			mimeType: "application/json",
		},
		async (uri) => {
			if (!clientConfig) {
				return {
					contents: [{ uri: uri.href, mimeType: "text/plain" as const, text: "Ryzome API key not configured." }],
				};
			}
			const result = await new RyzomeClient(clientConfig).listDocuments({
				inLibraryOnly: true,
				contentTypes: ["Bundle"],
			});
			const summaries = result.data.map((bundle) => ({
				id: bundle._id.$oid,
				title: bundle.title ?? "Untitled",
				description: bundle.description ?? null,
				tags: bundle.tags ?? [],
				updatedAt: bundle.updatedAt,
				url: buildDocumentViewAppUrl(clientConfig.appUrl, bundle),
			}));
			return {
				contents: [{ uri: uri.href, mimeType: "application/json" as const, text: JSON.stringify(summaries, null, 2) }],
			};
		},
	);

	server.resource(
		"canvas",
		new ResourceTemplate("ryzome://canvas/{id}", {
			list: async () => {
				if (!clientConfig) return { resources: [] };

				try {
					const client = new RyzomeClient(clientConfig);
					const result = await client.listCanvases();
					return {
						resources: result.data.map((c) => ({
							uri: `ryzome://canvas/${c._id.$oid}`,
							name: c.name,
							description: c.description ?? undefined,
							mimeType: "text/markdown" as const,
						})),
					};
				} catch {
					return { resources: [] };
				}
			},
		}),
		{
			description:
				"Retrieve a Ryzome canvas as structured markdown with nodes and connections",
			mimeType: "text/markdown",
		},
		async (uri, { id }) => {
			if (!clientConfig) {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain" as const,
							text: "Ryzome API key not configured.",
						},
					],
				};
			}

			const client = new RyzomeClient(clientConfig);
			const canvas = await client.getCanvas(resourceIdToString(id));
			const markdown = formatCanvasAsMarkdown(canvas, {
				appUrl: clientConfig.appUrl,
			});

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "text/markdown" as const,
						text: markdown,
					},
				],
			};
		},
	);

	server.resource(
		"document",
		new ResourceTemplate("ryzome://document/{id}", {
			list: async () => {
				if (!clientConfig) return { resources: [] };

				try {
					const client = new RyzomeClient(clientConfig);
					const result = await client.listDocuments({ inLibraryOnly: true });
					return {
						resources: result.data.map((document) => ({
							uri: `ryzome://document/${document._id.$oid}`,
							name: document.title ?? "Untitled",
							description: document.description ?? undefined,
							mimeType: "text/markdown" as const,
						})),
					};
				} catch {
					return { resources: [] };
				}
			},
		}),
		{
			description:
				"Retrieve a Ryzome document as markdown, including text and content details",
			mimeType: "text/markdown",
		},
		async (uri, { id }) => {
			if (!clientConfig) {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain" as const,
							text: "Ryzome API key not configured.",
						},
					],
				};
			}

			const client = new RyzomeClient(clientConfig);
			const document = await client.getDocument(resourceIdToString(id));
			const markdown = formatDocumentAsMarkdown(document, {
				appUrl: clientConfig.appUrl,
			});

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "text/markdown" as const,
						text: markdown,
					},
				],
			};
		},
	);

	server.resource(
		"bundle",
		new ResourceTemplate("ryzome://bundle/{id}", {
			list: async () => {
				if (!clientConfig) return { resources: [] };
				try {
					const result = await new RyzomeClient(clientConfig).listDocuments({
						inLibraryOnly: true,
						contentTypes: ["Bundle"],
					});
					return {
						resources: result.data.map((bundle) => ({
							uri: `ryzome://bundle/${bundle._id.$oid}`,
							name: bundle.title ?? "Untitled",
							description: bundle.description ?? undefined,
							mimeType: "text/markdown" as const,
						})),
					};
				} catch {
					return { resources: [] };
				}
			},
		}),
		{
			description: "Retrieve a Ryzome bundle as markdown, including its ordered documents",
			mimeType: "text/markdown",
		},
		async (uri, { id }) => {
			if (!clientConfig) {
				return {
					contents: [{ uri: uri.href, mimeType: "text/plain" as const, text: "Ryzome API key not configured." }],
				};
			}
			const bundle = await new RyzomeClient(clientConfig).getDocument(resourceIdToString(id));
			if (bundle.content._type !== "Bundle") {
				throw new Error(`Document ${resourceIdToString(id)} is a ${bundle.content._type}, not a Bundle.`);
			}
			return {
				contents: [{
					uri: uri.href,
					mimeType: "text/markdown" as const,
					text: formatDocumentAsMarkdown(bundle, { appUrl: clientConfig.appUrl }),
				}],
			};
		},
	);

	return server;
}
