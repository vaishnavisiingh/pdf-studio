import { useState, useCallback } from "react";
import { openDocument, getPage, closeDocument } from "../api/document";
import { pollJob } from "../api/jobs";
import useDocumentStore from "../store/documentStore";
import useUIStore from "../store/uiStore";

export function useDocument() {
  const { openDocument: storeOpen, closeDocument: storeClose, setActivePage } = useDocumentStore();
  const { setLoading } = useUIStore();
  const [error, setError] = useState(null);

  const open = useCallback(async (filePath) => {
    setLoading(true, "Reading document...");
    setError(null);
    try {
      const { job_id } = await openDocument(filePath);
      const docInfo = await pollJob(job_id, progress =>
        setLoading(true, `Building ID-REP... ${progress}%`)
      );
      storeOpen(docInfo.id, docInfo);
      return docInfo;
    } catch (err) {
      setError(err.message || "Failed to open document");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPage = useCallback(async (docId, pageNum, dpi = 150) => {
    try {
      const data = await getPage(docId, pageNum, dpi);
      setActivePage(docId, pageNum);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const close = useCallback(async (docId) => {
    await closeDocument(docId);
    storeClose(docId);
  }, []);

  return { open, fetchPage, close, error };
}
