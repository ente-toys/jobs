import { Navigate, Route, Routes } from "react-router-dom";

import { AdminPage } from "./components/AdminPage";
import { HomePage } from "./components/HomePage";
import { JobApplicationPage } from "./components/JobApplicationPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/:slug" element={<JobApplicationPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
