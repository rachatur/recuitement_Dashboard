import React, { useState } from 'react';
import { CandidateDocument } from '../../types';
import { FileText, Download, Upload, Trash2, Eye, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import api, { API_BASE_URL } from '../../api/client';
import { useNotifications } from '../../contexts/NotificationContext';
import { Modal } from '../common/Modal';

interface DocumentManagerProps {
  candidateId: string;
  documents: CandidateDocument[];
  onDocumentUploaded: () => void;
  canUpload?: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  candidateId,
  documents,
  onDocumentUploaded,
  canUpload = true,
}) => {
  const { showToast } = useNotifications();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Resume');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const sortedDocs = [...documents].sort((a, b) => b.version_number - a.version_number);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${docName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingDocId(docId);
    try {
      await api.delete(`/candidates/${candidateId}/documents/${docId}`);
      showToast('success', 'Document Deleted', `Deleted ${docName}`);
      onDocumentUploaded();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.response?.data?.detail || 'Could not delete document');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('error', 'Validation Error', 'Please select a document file to upload');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', docType);

    try {
      await api.post(`/candidates/${candidateId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('success', 'Document Uploaded', `Successfully uploaded ${selectedFile.name} (Version ${(sortedDocs[0]?.version_number || 0) + 1})`);
      setIsUploadOpen(false);
      setSelectedFile(null);
      onDocumentUploaded();
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.response?.data?.detail || 'Could not upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-400" />
            Resume Documents & Version History
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable document store. Every version is preserved for compliance.
          </p>
        </div>
        {canUpload && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-900/30 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload New Version
          </button>
        )}
      </div>

      {sortedDocs.length === 0 ? (
        <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-slate-800">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedDocs.map((doc, idx) => {
            const isLatest = idx === 0;
            const dateObj = new Date(doc.created_at);
            const dateStr = !isNaN(dateObj.getTime())
              ? format(dateObj, 'dd MMM yyyy, HH:mm')
              : doc.created_at;

            const downloadUrl = doc.file_url.startsWith('http')
              ? doc.file_url
              : `${API_BASE_URL.replace('/api/v1', '')}${doc.file_url}`;

            return (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isLatest
                    ? 'bg-slate-850 border-brand-500/40 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isLatest
                        ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-slate-100 text-sm">{doc.file_name}</h5>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isLatest
                            ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        v{doc.version_number} {isLatest && '(Active)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>Size: {formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>Uploaded: {dateStr}</span>
                      {doc.uploaded_by_name && (
                        <>
                          <span>•</span>
                          <span>By: {doc.uploaded_by_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700"
                    title="Download / View document"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>

                  {canUpload && (
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                      disabled={deletingDocId === doc.id}
                      className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-rose-900/50 disabled:opacity-50"
                      title="Delete this document version"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Version Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Resume Document"
        subtitle={`Version ${(sortedDocs[0]?.version_number || 0) + 1} will be automatically assigned. Previous versions will remain intact.`}
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="Resume">Resume / Curriculum Vitae</option>
              <option value="Certificate">Technical Certification</option>
              <option value="ID_Proof">Identity Proof</option>
              <option value="Offer_Letter">Previous Offer Letter / Payslip</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Select Document File (PDF, DOC, DOCX - max 15MB)
            </label>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-brand-500/60 transition-colors bg-slate-950/40">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer"
              />
              {selectedFile && (
                <p className="text-xs text-brand-300 mt-2 font-medium">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-900/40 transition-all flex items-center gap-2"
            >
              {isUploading ? 'Uploading...' : 'Confirm Upload'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
