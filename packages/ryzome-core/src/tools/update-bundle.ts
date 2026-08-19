import { z } from "zod";
import { buildDocumentViewAppUrl } from "../lib/app-url.js";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";

export const updateBundleToolName = "update_ryzome_bundle";
export const updateBundleToolDescription =
	"Add, remove, or reorder documents in a Ryzome bundle. When combining operations, adds and removals are applied first; document_ids then reorders and must contain the complete resulting set of document IDs (current IDs minus removals plus additions).";

export const updateBundleParamsSchema = z.object({
	bundle_id: z.string().describe("The ID of the bundle to update"),
	add_document_ids: z
		.array(z.string())
		.optional()
		.describe("Document IDs to add"),
	remove_document_ids: z
		.array(z.string())
		.optional()
		.describe("Document IDs to remove"),
	document_ids: z
		.array(z.string())
		.optional()
		.describe(
			"Full desired document order. When combined with add/remove, this must be the complete resulting set of document IDs after those operations are applied.",
		),
});

export async function executeUpdateBundle(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = updateBundleParamsSchema.parse(rawParams);
	const operations = [
		...(params.add_document_ids ?? []).map((id) => ({
			_type: "addDocument" as const,
			id,
		})),
		...(params.remove_document_ids ?? []).map((id) => ({
			_type: "removeDocument" as const,
			id,
		})),
		...(params.document_ids
			? [{ _type: "reorderDocuments" as const, ids: params.document_ids }]
			: []),
	];
	if (operations.length === 0) throw new Error("No bundle updates provided.");

	const client = new RyzomeClient(clientConfig);
	await client.patchBundle(params.bundle_id, { operations });
	const bundle = await client.getDocument(params.bundle_id);
	if (bundle.content._type !== "Bundle") {
		throw new Error(
			`Document ${params.bundle_id} is a ${bundle.content._type}, not a Bundle.`,
		);
	}
	return {
		content: [
			{
				type: "text" as const,
				text: [
					`Bundle updated: **${bundle.title ?? "Untitled"}**`,
					`ID: ${bundle._id.$oid}`,
					`Documents: ${bundle.content._content.documentsMetadata.length}`,
					`View: ${buildDocumentViewAppUrl(clientConfig.appUrl, bundle)}`,
				].join("\n"),
			},
		],
	};
}
