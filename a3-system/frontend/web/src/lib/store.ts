import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StudentProfile, ChatMessage } from "@/types";

interface AppState {
  studentId: string | null;
  profile: StudentProfile | null;
  userName: string | null;
  userEmail: string | null;
  currentTopic: string | null;
  chatMessages: ChatMessage[];
  isHydrated: boolean;
  setStudentId: (id: string) => void;
  setProfile: (profile: StudentProfile | null) => void;
  setUserName: (name: string | null) => void;
  setUserEmail: (email: string | null) => void;
  setCurrentTopic: (topic: string | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      studentId: null,
      profile: null,
      userName: null,
      userEmail: null,
      currentTopic: null,
      chatMessages: [],
      isHydrated: false,
      setStudentId: (id) => set({ studentId: id }),
      setProfile: (profile) => set({ profile }),
      setUserName: (name) => set({ userName: name }),
      setUserEmail: (email) => set({ userEmail: email }),
      setCurrentTopic: (topic) => set({ currentTopic: topic }),
      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      clearChat: () => set({ chatMessages: [] }),
      logout: () =>
        set({
          studentId: null,
          profile: null,
          userName: null,
          userEmail: null,
          currentTopic: null,
          chatMessages: [],
        }),
    }),
    {
      name: "a3-learning-storage",
      partialize: (state) => ({
        studentId: state.studentId,
        profile: state.profile,
        userName: state.userName,
        userEmail: state.userEmail,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);
