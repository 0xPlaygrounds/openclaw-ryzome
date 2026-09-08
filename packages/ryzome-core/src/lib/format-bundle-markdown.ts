import { buildDocumentAppUrl } from "./app-url.js";
import type { BundleDocument } from "./client/bundle.js";

export function formatBundleAsMarkdown(
	bundle: BundleDocument,
	opts?: { appUrl?: string },
): string {
	const lines = [
		`# ${bundle.title ?? "Untitled bundle"}`,
		`ID: ${bundle._id.$oid}`,
	];
	if (opts?.appUrl)
		lines.push(`View: ${buildDocumentAppUrl(opts.appUrl, bundle._id.$oid)}`);
	if (bundle.description) lines.push("", bundle.description);
	lines.push("", "## Documents");
	for (const member of bundle.content._content.documentsMetadata) {
		if (member._type === "Authorized") {
			const document = member._content;
			lines.push(
				`- ${document.title ?? "Untitled"} (${document.content._type}) — ${document._id.$oid}`,
			);
		} else if (member._type === "Error") {
			lines.push(
				`- ${member._content.documentId.$oid} — Error: ${member._content.message}`,
			);
		} else {
			lines.push(`- ${member._content.$oid} — ${member._type}`);
		}
	}
	if (!bundle.content._content.documentsMetadata.length)
		lines.push("This bundle is empty.");
	return lines.join("\n");
}
