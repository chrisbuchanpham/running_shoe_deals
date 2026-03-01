import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useDataset } from "./lib/dataLoader";
import { HomePage } from "./pages/HomePage";
import { DealsPage } from "./pages/DealsPage";
import { ShoeDetailPage } from "./pages/ShoeDetailPage";
import { RetailersPage } from "./pages/RetailersPage";
import { TermsPage } from "./pages/TermsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { DisclaimerPage } from "./pages/DisclaimerPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  const { loading, data, error } = useDataset();

  if (loading) {
    return (
      <Layout>
        <section>
          <h1>Loading snapshot...</h1>
        </section>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <section>
          <h1>Data failed to load</h1>
          <p>{error ?? "Unknown error."}</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout metadata={data.metadata}>
      <Routes>
        <Route path="/" element={<HomePage data={data} />} />
        <Route path="/home" element={<Navigate replace to="/" />} />
        <Route path="/deals" element={<DealsPage data={data} />} />
        <Route path="/shoes/:shoeId" element={<ShoeDetailPage data={data} />} />
        <Route path="/retailers" element={<RetailersPage data={data} />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
