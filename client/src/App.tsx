import { useEffect } from "react";

function App() {
  useEffect(() => {
    window.location.href = "/index.html";
  }, []);
  return null;
}

export default App;
