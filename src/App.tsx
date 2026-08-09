import { RouterProvider } from "react-router";
import { ToastProvider } from "./shared/ui";
import { router } from "./app/router";

function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

export default App;
