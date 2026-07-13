import { Route, Routes } from "react-router-dom";
import ProjectIntro from "./ProjectIntro.jsx";
import LandingPage from "./pages/m/LandingPage.jsx";
import ProgressPage from "./pages/m/ProgressPage.jsx";
import OwnerDashboard from "./pages/owner/OwnerDashboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectIntro />} />
      <Route path="/m/:machineId" element={<LandingPage />} />
      <Route path="/m/:machineId/progress" element={<ProgressPage />} />
      <Route path="/owner" element={<OwnerDashboard />} />
    </Routes>
  );
}
