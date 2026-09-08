import type {
	BundleContent,
	CreateBundleContent,
	PatchBundleRequest,
} from "./bundle.js";
import type {
	AddMessageRequest,
	CreateConversationRequest,
	UpdateConversationRequest,
} from "./conversation.js";
import createClient from "openapi-fetch";

import type { components, paths } from "./schema";
import type {
	DocumentListItem,
	DocumentListResponse,
} from "./document-list.js";

// Override the stale generated list contract without changing other endpoints.
type DocumentListOperation = Omit<
	paths["/document"]["get"],
	"parameters" | "responses"
> & {
	parameters: { query?: { tags?: string[]; pinned?: boolean } };
	responses: {
		200: { content: { "application/json": DocumentListResponse } };
		500: paths["/document"]["get"]["responses"][500];
	};
};
type ApiPaths = Omit<paths, "/document"> & {
	"/document": Omit<paths["/document"], "get" | "post"> & {
		get: DocumentListOperation;
		post: Omit<paths["/document"]["post"], "requestBody"> & {
			requestBody: { content: { "application/json": CreateDocumentsRequest } };
		};
	};
	"/bundle/{bundle_id}": {
		patch: {
			parameters: { path: { bundle_id: string } };
			requestBody: { content: { "application/json": PatchBundleRequest } };
			responses: {
				200: { content: { "application/json": { num_success: number } } };
				400: { content: { "text/plain": string } };
				404: { content: { "text/plain": string } };
				500: { content: { "text/plain": string } };
			};
		};
	};
	// NOTE: Manually added — regenerate later from the backend conversation routes.
	"/conversation": {
		get: {
			parameters: { query?: { pinned?: boolean } };
			responses: {
				200: { content: { "application/json": unknown } };
				500: paths["/document"]["get"]["responses"][500];
			};
		};
		post: {
			requestBody: {
				content: { "application/json": CreateConversationRequest };
			};
			responses: {
				200: { content: { "application/json": { conversation_id: string } } };
				500: paths["/document"]["get"]["responses"][500];
			};
		};
	};
	"/conversation/search": {
		get: {
			parameters: { query: { q: string } };
			responses: {
				200: { content: { "application/json": unknown } };
				500: paths["/document"]["get"]["responses"][500];
			};
		};
	};
	"/conversation/{conversation_id}": {
		get: {
			parameters: { path: { conversation_id: string } };
			responses: {
				200: { content: { "application/json": unknown } };
				500: paths["/document"]["get"]["responses"][500];
			};
		};
		patch: {
			parameters: { path: { conversation_id: string } };
			requestBody: {
				content: { "application/json": UpdateConversationRequest };
			};
			responses: {
				200: { content: { "application/json": unknown } };
				500: paths["/document"]["get"]["responses"][500];
			};
		};
	};
	"/conversation/{conversation_id}/messages": {
		get: {
			parameters: { path: { conversation_id: string } };
			responses: {
				200: { content: { "application/json": unknown } };
				404: { content: { "text/plain": string } };
				500: { content: { "text/plain": string } };
			};
		};
		post: {
			parameters: { path: { conversation_id: string } };
			requestBody: { content: { "application/json": AddMessageRequest } };
			responses: {
				200: { content: { "application/json": { message: unknown } } };
				500: { content: { "text/plain": string } };
			};
		};
	};
	"/conversations": {
		delete: {
			requestBody: {
				content: { "application/json": { conversation_ids: string[] } };
			};
			responses: {
				200: { content: { "application/json": { deleted: boolean } } };
				400: { content: { "text/plain": string } };
				500: { content: { "text/plain": string } };
			};
		};
	};
};

export function createApiClient(baseUrl: string) {
	return createClient<ApiPaths>({
		baseUrl,
	});
}

export type { components };
export type CanvasSchemas = components["schemas"];

// Client-facing types (used by RyzomeClient method signatures)
export type CreateCanvasRequest = CanvasSchemas["api.create_canvas.Request"];
export type CreateCanvasResponse = CanvasSchemas["api.create_canvas.Response"];
export type ListCanvasesResponse = CanvasSchemas["api.get_canvases.Response"];
export type PatchCanvasRequest = CanvasSchemas["api.patch_canvas.Request"];
export type PatchDocumentRequest = CanvasSchemas["api.patch_document.Request"];
export type GetUploadUrlRequest = CanvasSchemas["api.get_upload_url.Request"];
export type GetUploadUrlResponse = CanvasSchemas["api.get_upload_url.Response"];
export type UpdateDocumentMetadataRequest =
	CanvasSchemas["api.update_document_metadata.Request"];
export type UpdateDocumentMetadataResponse =
	CanvasSchemas["api.update_document_metadata.Response"];

// API types for document routes (used internally by RyzomeClient)
export type CreateDocumentsRequest = {
	documents: CreateDocumentRequestDocument[];
};
export type CreateDocumentsResponse =
	CanvasSchemas["api.create_documents.Response"];
export type CreateDocumentRequestDocument = Omit<
	CanvasSchemas["api.create_documents.RequestDocument"],
	"content"
> & { content?: CanvasSchemas["DocumentContentView"] | CreateBundleContent };
export type DocumentView = Omit<CanvasSchemas["DocumentView"], "content"> & {
	content: DocumentContentView;
};
export type DocumentMetadataView = CanvasSchemas["DocumentMetadataView"];
export type DocumentContentView =
	| CanvasSchemas["DocumentContentView"]
	| BundleContent;
export type DocumentOperation = CanvasSchemas["DocumentOperation"];
export type ListDocumentsResponse = { data: DocumentListItem[] };

// Canvas view types (used by downstream consumers)
export type CanvasEditorView = CanvasSchemas["CanvasEditorView"];
export type CanvasSummaryView = CanvasSchemas["CanvasSummaryView"];

export type PatchOperation = Extract<
	CanvasSchemas["Operation"],
	{ _type: "createNode" | "createEdge" | "setNodeColor" }
>;

// Conversation types (used by RyzomeClient conversation methods)
export type {
	AddMessageRequest,
	CreateConversationRequest,
	UpdateConversationRequest,
} from "./conversation.js";
