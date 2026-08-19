import { z } from "zod";
import { buildDocumentViewAppUrl } from "../lib/app-url.js";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";

export const createBundleToolName = "create_ryzome_bundle";
export const createBundleToolDescription =
	"Create a Ryzome bundle: an ordered collection of document references. " +
	"The result starts with a 'View: <url>' line — include that URL verbatim in your reply so the user can open the bundle.";

export const createBundleParamsSchema = z.object({
	title: z.string().optional().describe("Bundle title"),
	description: z.string().optional().describe("Bundle description"),
	tags: z.array(z.string()).optional().describe("Bundle tags"),
	document_ids: z
		.array(z.string())
		.optional()
		.describe("Document IDs to include, in display order"),
});

export async function executeCreateBundle(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = createBundleParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const bundle = await client.createDocument({
		title: params.title,
		description: params.description,
		tags: params.tags,
		content: {
			_type: "Bundle",
			_content: { ids: params.document_ids ?? [] },
		} as never,
	});

	if (bundle.content._type !== "Bundle") {
		throw new Error(
			`Bundle creation returned a ${bundle.content._type} document.`,
		);
	}

	return {
		content: [
			{
				type: "text",
				text: [
					`View: ${buildDocumentViewAppUrl(clientConfig.appUrl, bundle)}`,
					`Bundle created: **${bundle.title ?? "Untitled"}**`,
					`ID: ${bundle._id.$oid}`,
					`Documents: ${bundle.content._content.documentsMetadata.length}`,
				].join("\n"),
			},
		],
	};
}
