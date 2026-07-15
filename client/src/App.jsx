import { Navigate, Route, Routes } from "react-router-dom";
import ProjectIntro from "./ProjectIntro.jsx";
import LandingPage from "./pages/m/LandingPage.jsx";
import OwnerDashboard from "./pages/owner/OwnerDashboard.jsx";

/* 고객 화면은 /m/:machineId 하나다.
   고객은 QR을 한 번 찍는다 — 신청·진행 확인·수거 확인이 전부 그 화면에서 일어난다.
   /progress는 예전 링크가 돌아다닐 수 있어 리다이렉트로만 남긴다. */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectIntro />} />
      <Route path="/m/:machineId" element={<LandingPage />} />
      <Route path="/m/:machineId/progress" element={<Navigate to=".." relative="path" replace />} />
      <Route path="/owner" element={<OwnerDashboard />} />
    </Routes>
  );
}
