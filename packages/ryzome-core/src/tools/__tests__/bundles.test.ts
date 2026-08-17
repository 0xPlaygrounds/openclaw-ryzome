import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { executeCreateBundle } from "../create-bundle.js";
import { executeGetBundle } from "../get-bundle.js";
import { executeListBundles } from "../list-bundles.js";
import { executeUpdateBundle } from "../update-bundle.js";

const clientConfig = { apiKey: "secret-key", apiUrl: "https://api.ryzome.ai", appUrl: "https://ryzome.ai" };
const bundle = {
	_id: { $oid: "bundle123" },
	title: "Research", description: "Useful sources", generated: false, inLibrary: true,
	isFavorite: false, ownerId: "owner1", tags: ["research"],
	createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
	content: {
		_type: "Bundle" as const,
		_content: { documentsMetadata: [{ _id: { $oid: "doc123" }, title: "Source", content: { _type: "Text" as const }, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }] },
	},
};

describe("bundle tools", () => {
	afterEach(() => vi.restoreAllMocks());

	it("creates a bundle with its initial document order", async () => {
		const createSpy = vi.spyOn(RyzomeClient.prototype, "createDocument").mockResolvedValue(bundle as never);
		const result = await executeCreateBundle({ title: "Research", document_ids: ["doc123"] }, clientConfig);
		expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ content: { _type: "Bundle", _content: { ids: ["doc123"] } } }));
		expect(result.content[0].text).toContain("Bundle created: **Research**");
	});

	it("gets and lists bundles", async () => {
		vi.spyOn(RyzomeClient.prototype, "getDocument").mockResolvedValue(bundle as never);
		vi.spyOn(RyzomeClient.prototype, "listDocuments").mockResolvedValue({ data: [bundle] } as never);
		const getResult = await executeGetBundle({ bundle_id: "bundle123" }, clientConfig);
		const listResult = await executeListBundles({}, clientConfig);
		expect(getResult.content[0].text).toContain('"id": "doc123"');
		expect(listResult.content[0].text).toContain('"count": 1');
	});

	it("patches bundle membership before returning the refreshed bundle", async () => {
		const patchSpy = vi.spyOn(RyzomeClient.prototype, "patchBundle").mockResolvedValue(undefined);
		vi.spyOn(RyzomeClient.prototype, "getDocument").mockResolvedValue(bundle as never);
		await executeUpdateBundle({ bundle_id: "bundle123", add_document_ids: ["doc456"], remove_document_ids: ["doc789"], document_ids: ["doc456", "doc123"] }, clientConfig);
		expect(patchSpy).toHaveBeenCalledWith("bundle123", {
			operations: [
				{ _type: "addDocument", id: "doc456" },
				{ _type: "removeDocument", id: "doc789" },
				{ _type: "reorderDocuments", ids: ["doc456", "doc123"] },
			],
		});
	});
});
