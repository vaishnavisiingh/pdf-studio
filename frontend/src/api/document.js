import client from "./client";
export const openDocument  = (path)                    => client.post("/document/open", { path }).then(r => r.data);
export const getDocInfo    = (docId)                   => client.get(`/document/${docId}/info`).then(r => r.data);
export const getPage       = (docId, n, dpi=150, bust=0) => client.get(`/document/${docId}/page/${n}`, { params: { dpi, bust } }).then(r => r.data);
export const getNodes      = (docId, params={})        => client.get(`/document/${docId}/nodes`, { params }).then(r => r.data);
export const closeDocument = (docId)                   => client.delete(`/document/${docId}/close`).then(r => r.data);
