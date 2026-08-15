import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { BoardPage } from './pages/BoardPage'
import { BoardsPage } from './pages/BoardsPage'
import { LoginPage } from './pages/LoginPage'
import { PostPage } from './pages/PostPage'
import { RegisterPage } from './pages/RegisterPage'
import { WorkspacesPage } from './pages/WorkspacesPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <WorkspacesPage /> },
          { path: 'workspaces/:workspaceId', element: <BoardsPage /> },
          { path: 'workspaces/:workspaceId/boards/:boardId', element: <BoardPage /> },
          {
            path: 'workspaces/:workspaceId/boards/:boardId/posts/:postId',
            element: <PostPage />,
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
