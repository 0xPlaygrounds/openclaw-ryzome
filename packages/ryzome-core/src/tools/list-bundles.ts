import { z } from "zod";
import { buildDocumentViewAppUrl } from "../lib/app-url.js";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";

export const listBundlesToolName = "list_ryzome_bundles";
export const listBundlesToolDescription = "List Ryzome bundles visible in the library.";

export const listBundlesParamsSchema = z.object({
	in_library_only: z.boolean().optional().describe("Only return library-visible bundles (defaults to true)"),
});

export async function executeListBundles(rawParams: unknown, clientConfig: RyzomeClientConfig) {
	const params = listBundlesParamsSchema.parse(rawParams);
	const result = await new RyzomeClient(clientConfig).listDocuments({
		inLibraryOnly: params.in_library_only ?? true,
		contentTypes: ["Bundle"],
	});
	const bundles = result.data.map((bundle) => ({
		id: bundle._id.$oid,
		title: bundle.title ?? "Untitled",
		description: bundle.description ?? null,
		tags: bundle.tags ?? [],
		updatedAt: bundle.updatedAt,
		url: buildDocumentViewAppUrl(clientConfig.appUrl, bundle),
	}));
	return { content: [{ type: "text" as const, text: JSON.stringify({ count: bundles.length, bundles }, null, 2) }] };
}
