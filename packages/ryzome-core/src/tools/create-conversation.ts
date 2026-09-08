import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { formatConversationAsMarkdown } from "../lib/format-conversation-markdown.js";

export const createConversationToolName = "create_ryzome_conversation";
export const createConversationToolDescription =
	"Create an empty Ryzome conversation (thread). Include the returned View URL in your reply.";
export const createConversationParamsSchema = z.object({
	title: z.string().optional().describe("Conversation title"),
	context: z
		.array(z.string().regex(/^[a-fA-F0-9]{24}$/))
		.optional()
		.describe("Existing document IDs to attach as initial context"),
});
export async function executeCreateConversation(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = createConversationParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const conversationId = await client.createConversation({
		title: params.title,
		context: params.context,
	});
	const conversation = await client.getConversation(conversationId);
	return {
		content: [
			{
				type: "text" as const,
				text: formatConversationAsMarkdown(conversation, {
					appUrl: clientConfig.appUrl,
				}),
			},
		],
	};
}
