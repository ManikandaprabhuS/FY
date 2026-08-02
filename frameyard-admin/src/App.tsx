import { RouterProvider } from 'react-router-dom';
import router from './routes';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#111111',
            border: '1px solid #d7d7d7',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.14)',
            fontSize: '14px',
            fontWeight: 600,
          },
          success: { iconTheme: { primary: '#111111', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } },
        }}
      />
    </>
  );
}

export default App;
