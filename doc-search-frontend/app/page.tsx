"use client";
import { useAuth } from "../contexts/AuthContext";
import Login from "../components/Login";
import FileUploader from "../components/FileUploader";
import FileGrid from "../components/FileGrid";
import SearchDocuments from "@/components/SearchDocuments";
import EnhancedNavbar from "@/components/EnhancedNavbar";
import { useState } from "react";
import EnhancedWelcomeSection from "../components/EnhancedWelcomeSection";

export default function Home() {
  const { currentUser, logout } = useAuth();
  const [documentCount, setDocumentCount] = useState(0);

  if (!currentUser) {
    return <Login />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Enhanced Navigation */}
      <EnhancedNavbar currentUser={currentUser} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Section: Welcome + Upload */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Welcome Section */}
          <EnhancedWelcomeSection
            documentCount={documentCount}
            storageUsed="245 MB" // You'll need to calculate this
            fileTypes={3} // You'll need to calculate this
            className="flex-1"
          />

          {/* Upload Section */}
          <div className="flex-1 bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Upload Documents
            </h3>
            <FileUploader />
          </div>
        </div>

        {/* Search Section */}
        <SearchDocuments />

        <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Your Files</h3>
          <FileGrid onFileCountUpdate={(count) => setDocumentCount(count)} />
        </div>
      </main>
    </div>
  );
}
