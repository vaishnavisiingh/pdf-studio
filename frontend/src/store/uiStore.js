import { create } from "zustand";

const useUIStore = create((set) => ({
  sidebarOpen:   true,
  aiPanelOpen:   false,
  theme:         "light",   // "light" | "dark"
  loading:       false,
  loadingMsg:    "",

  toggleSidebar:  () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  toggleAIPanel:  () => set(s => ({ aiPanelOpen: !s.aiPanelOpen })),
  toggleTheme:    () => set(s => ({ theme: s.theme === "light" ? "dark" : "light" })),
  setLoading:     (loading, msg = "") => set({ loading, loadingMsg: msg }),
}));

export default useUIStore;
