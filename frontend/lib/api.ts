const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = "Something went wrong";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (name: string, email: string, password: string) =>
    request("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  login: (email: string, password: string) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: () => request("/api/auth/me"),

  updateProfile: (name: string) =>
    request("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name }) }),

  uploadPdf: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/courses/upload", { method: "POST", body: form });
  },

  listCourses: () => request("/api/courses"),

  getCourse: (courseId: string) => request(`/api/courses/${courseId}`),

  searchCourse: (courseId: string, q: string) =>
    request(`/api/courses/${courseId}/search?q=${encodeURIComponent(q)}`),

  markLesson: (lessonId: string, completed: boolean, timeSpentSeconds = 0) =>
    request(`/api/progress/lessons/${lessonId}`, {
      method: "POST",
      body: JSON.stringify({ completed, time_spent_seconds: timeSpentSeconds }),
    }),

  dashboardStats: () => request("/api/progress/dashboard-stats"),

  getChatHistory: (courseId: string) => request(`/api/courses/${courseId}/chat`),

  sendChatMessage: (courseId: string, message: string) =>
    request(`/api/courses/${courseId}/chat`, { method: "POST", body: JSON.stringify({ message }) }),

  getQuiz: (chapterId: string) => request(`/api/chapters/${chapterId}/quiz`),

  submitQuiz: (chapterId: string, answers: Record<string, string>) =>
    request(`/api/chapters/${chapterId}/quiz/submit`, { method: "POST", body: JSON.stringify({ answers }) }),
};
