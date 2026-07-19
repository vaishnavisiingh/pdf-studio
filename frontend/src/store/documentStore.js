import { create } from "zustand";

const useDocumentStore = create((set, get) => ({
  // Open documents (tab model)
  documents: {},      // docId → { info, currentPage, totalPages }
  activeDocId: null,

  openDocument: (docId, info) => set(state => ({
    documents: {
      ...state.documents,
      [docId]: { info, currentPage: 0, totalPages: info.totalPages || info.page_count || 0 }
    },
    activeDocId: docId,
  })),

  closeDocument: (docId) => set(state => {
    const docs = { ...state.documents };
    delete docs[docId];
    const activeDocId = state.activeDocId === docId
      ? Object.keys(docs)[0] || null
      : state.activeDocId;
    return { documents: docs, activeDocId };
  }),

  setActivePage: (docId, page) => set(state => ({
    documents: {
      ...state.documents,
      [docId]: { ...state.documents[docId], currentPage: page }
    }
  })),

  getActiveDoc: () => {
    const { documents, activeDocId } = get();
    return activeDocId ? documents[activeDocId] : null;
  },
}));

export default useDocumentStore;
