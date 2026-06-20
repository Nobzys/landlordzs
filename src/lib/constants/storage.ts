// Single source of truth for the verification-document storage bucket.
// 'verification-documents' is canonical: it is the only bucket with the
// lzs_verifydoc_select/update/delete RLS policies (owner-or-moderator read,
// owner write). 'verification-documents-v2' has no policies and holds only
// legacy uploads from before this constant was corrected.
export const VERIFICATION_BUCKET = 'verification-documents'
