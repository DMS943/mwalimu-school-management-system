
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./components/pages/Index";
import NotFound from "./components/pages/NotFound";
import ParentSignup from "./components/pages/ParentSignup";

// Teacher pages
import TeacherClasses from "./components/pages/teacher/Classes";
import TeacherGrades from "./components/pages/teacher/Grades";
import TeacherAttendance from "./components/pages/teacher/Attendance";
import TeacherStudents from "./components/pages/teacher/Students";
import TeacherReports from "./components/pages/teacher/Reports";
import TeacherSchedule from "./components/pages/teacher/Schedule";

// Admin pages
import AdminUsers from "./components/pages/admin/Users";
import AdminClasses from "./components/pages/admin/Classes";
import AdminStudents from "./components/pages/admin/Students";
import AdminReports from "./components/pages/admin/Reports";
import AdminSettings from "./components/pages/admin/Settings";
import AdminTerms from "./components/pages/admin/Terms";
import AcademicSettings from "./components/pages/admin/AcademicSettings";

// Create a stable query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/parent-signup" element={<ParentSignup />} />
          
          {/* Teacher Routes */}
          <Route path="/teacher/classes" element={<TeacherClasses />} />
          <Route path="/teacher/grades" element={<TeacherGrades />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/students" element={<TeacherStudents />} />
          <Route path="/teacher/reports" element={<TeacherReports />} />
          <Route path="/teacher/schedule" element={<TeacherSchedule />} />
          
          {/* Admin Routes */}
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/classes" element={<AdminClasses />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/terms" element={<AdminTerms />} />
          <Route path="/admin/academic-settings" element={<AcademicSettings />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
