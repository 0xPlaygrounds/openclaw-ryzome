import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { formatBundleAsMarkdown } from "../lib/format-bundle-markdown.js";
export const createBundleToolName = "create_ryzome_bundle";
export const createBundleToolDescription =
	"Create an ordered Ryzome bundle containing existing documents. Include the returned View URL in your reply.";
export const createBundleParamsSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	document_ids: z
		.array(z.string().regex(/^[a-fA-F0-9]{24}$/))
		.default([])
		.describe("Existing document IDs in initial order"),
});
export async function executeCreateBundle(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = createBundleParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const bundle = await client.createBundle({
		title: params.title,
		description: params.description,
		tags: params.tags,
		documentIds: params.document_ids,
	});
	return {
		content: [
			{
				type: "text" as const,
				text: formatBundleAsMarkdown(bundle, { appUrl: clientConfig.appUrl }),
			},
		],
	};
}
