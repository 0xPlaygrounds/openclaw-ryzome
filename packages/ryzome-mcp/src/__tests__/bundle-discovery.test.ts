import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, expect, it, vi } from "vitest";
import { createRyzomeMcpServer } from "../server.js";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

it("advertises bundle tools and lists bundles through MCP", async () => {
	vi.stubEnv("RYZOME_API_KEY", "test-key");
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					documents: [
						{
							_id: { $oid: "0123456789abcdef01234567" },
							title: "Research pack",
							description: null,
							content: { _type: "Bundle" },
							pinned: true,
							inLibrary: true,
							tags: [],
							createdAt: { $date: { $numberLong: "1767225600000" } },
							updatedAt: { $date: { $numberLong: "1767225600000" } },
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		),
	);
	const server = createRyzomeMcpServer();
	const client = new Client({ name: "bundle-test", version: "1.0.0" });
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	try {
		await server.connect(serverTransport);
		await client.connect(clientTransport);
		const { tools } = await client.listTools();
		expect(tools.map((tool) => tool.name)).toEqual(
			expect.arrayContaining([
				"create_ryzome_bundle",
				"get_ryzome_bundle",
				"update_ryzome_bundle",
			]),
		);
		const result = await client.callTool({
			name: "list_ryzome_documents",
			arguments: { content_types: ["Bundle"] },
		});
		expect(result.isError).not.toBe(true);
		expect(result.content).toEqual([
			expect.objectContaining({
				type: "text",
				text: expect.stringContaining('"contentType": "Bundle"'),
			}),
		]);
	} finally {
		await client.close();
		await server.close();
	}
});
