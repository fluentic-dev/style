import { getDocumentSheet } from '../../runtime/sheet/document';
import { createDevSheet } from '../../sheet/dev';

// Vite can evaluate this entry through both source imports and optimized dependencies.
// Reuse the document sheet so previously injected global rules remain registered.
getDocumentSheet(createDevSheet);
