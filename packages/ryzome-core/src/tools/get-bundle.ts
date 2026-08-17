import { z } from "zod";
import { buildDocumentViewAppUrl } from "../lib/app-url.js";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";

export const getBundleToolName = "get_ryzome_bundle";
export const getBundleToolDescription = "Retrieve a Ryzome bundle and its ordered documents.";

export const getBundleParamsSchema = z.object({
	bundle_id: z.string().describe("The ID of the bundle to retrieve"),
});

export async function executeGetBundle(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = getBundleParamsSchema.parse(rawParams);
	const bundle = await new RyzomeClient(clientConfig).getDocument(params.bundle_id);
	if (bundle.content._type !== "Bundle") {
		throw new Error(`Document ${params.bundle_id} is a ${bundle.content._type}, not a Bundle.`);
	}

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(
					{
						id: bundle._id.$oid,
						title: bundle.title ?? "Untitled",
						description: bundle.description,
						tags: bundle.tags ?? [],
						url: buildDocumentViewAppUrl(clientConfig.appUrl, bundle),
						documents: bundle.content._content.documentsMetadata.map((document) => ({
							id: document._id.$oid,
							title: document.title ?? "Untitled",
							contentType: document.content._type,
						})),
					},
					null,
					2,
				),
			},
		],
	};
}
