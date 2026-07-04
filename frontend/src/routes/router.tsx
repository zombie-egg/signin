import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../app/AppLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { ProfilePage } from "../features/auth/ProfilePage";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage";
import { SealDetailPage } from "../features/seals/SealDetailPage";
import { SealsPage } from "../features/seals/SealsPage";
import { ContractPreviewPage } from "../features/contracts/ContractPreviewPage";
import { ContractsPage } from "../features/contracts/ContractsPage";
import { ContractStampPage } from "../features/contracts/ContractStampPage";
import { ContractUploadPage } from "../features/contracts/ContractUploadPage";
import { ExternalSignPage } from "../features/external/ExternalSignPage";
import { SignTaskDetailPage } from "../features/signTasks/SignTaskDetailPage";
import { SignTasksPage } from "../features/signTasks/SignTasksPage";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/profile" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/sign/:token", element: <ExternalSignPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/profile", element: <ProfilePage /> },
          { path: "/change-password", element: <ChangePasswordPage /> },
          {
            element: <ProtectedRoute permission="seal:list" />,
            children: [
              { path: "/seals", element: <SealsPage /> },
              { path: "/seals/:id", element: <SealDetailPage /> },
            ],
          },
          {
            element: <ProtectedRoute permission="contract:list" />,
            children: [
              { path: "/contracts", element: <ContractsPage /> },
              { path: "/contracts/:id", element: <ContractPreviewPage /> },
            ],
          },
          {
            element: <ProtectedRoute permission="contract:upload" />,
            children: [{ path: "/contracts/upload", element: <ContractUploadPage /> }],
          },
          {
            element: <ProtectedRoute permission="seal:use" />,
            children: [{ path: "/contracts/stamp", element: <ContractStampPage /> }],
          },
          {
            element: <ProtectedRoute permission="signtask:list" />,
            children: [
              { path: "/sign-tasks", element: <SignTasksPage /> },
              { path: "/sign-tasks/:id", element: <SignTaskDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
