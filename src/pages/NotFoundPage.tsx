import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section>
      <h1>Page Not Found</h1>
      <p>The route you requested does not exist in this build.</p>
      <Link to="/">Return home</Link>
    </section>
  );
}
