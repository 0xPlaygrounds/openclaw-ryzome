import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { formatBundleAsMarkdown } from "../lib/format-bundle-markdown.js";
import { bundleOperationSchema } from "../lib/client/bundle.js";
export const updateBundleToolName = "update_ryzome_bundle";
export const updateBundleToolDescription =
	"Add, remove, or reorder documents in a Ryzome bundle. Removing membership does not delete the document. Reordering must include every current member exactly once. System bundles enforce server restrictions.";
export const updateBundleParamsSchema = z.object({
	bundle_id: z.string().regex(/^[a-fA-F0-9]{24}$/),
	operations: z.array(bundleOperationSchema).min(1),
});
export async function executeUpdateBundle(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = updateBundleParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	await client.patchBundle(params.bundle_id, { operations: params.operations });
	const bundle = await client.getBundle(params.bundle_id);
	return {
		content: [
			{
				type: "text" as const,
				text: formatBundleAsMarkdown(bundle, { appUrl: clientConfig.appUrl }),
			},
		],
	};
}
